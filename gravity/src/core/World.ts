/*
 * Portions of this file are derived from the Sopiro Physics Engine.
 *
 * Copyright (c) 2022 Sopiro
 * Licensed under the MIT License
 *
 * Original project:
 * https://github.com/Sopiro
 */
import * as CCD from '../collision/CCD';
import { canCollide } from '../collision/CollisionFilter';
import { ContactManifold } from '../collision/ContactManifold';
import * as NarrowPhase from '../collision/NarrowPhase';
import { applyWeightForce } from '../force/Gravity';
import { Joint } from '../joint/Joint';
import { Vec2 } from '../math/Vec2';
import * as Utils from '../utils/Utils';
import { MAX_BODIES, MIN_BULLET_SPEED_SQUARED, SETTINGS } from './Constants';
import { RigidBody } from './RigidBody';

export class World {
    private readonly up = new Vec2(0, 1);
    private G: number;

    private bodies: RigidBody[] = [];
    /** Pairs are allocated in blocks of 2 */
    private potentialPairs: RigidBody[] = [];

    private joints: Joint[] = [];

    private manifolds: ContactManifold[] = [];
    private manifoldsNext: ContactManifold[] = [];

    private manifoldMap: Map<number, ContactManifold> = new Map();
    private manifoldMapNext: Map<number, ContactManifold> = new Map();

    private readonly manifoldPool = NarrowPhase.manifoldPool;

    private forces: Vec2[] = [];
    private torques: number[] = [];

    private dtFractions: number[] = [];

    constructor(gravity: number) {
        this.G = -gravity;
    }

    addBody(body: RigidBody): void {
        if (this.bodies.length >= MAX_BODIES) return;

        this.bodies.push(body);
    }

    removeBody(body: RigidBody): void {
        for (let i = 0; i < this.bodies.length; i++) {
            const current = this.bodies[i];

            // It suffices to look for the position going below the screen
            if (body.id === current.id) {
                this.bodies[i] = this.bodies[this.bodies.length - 1];
                this.bodies.pop();
                return;
            }
        }
    }

    getBodies(): RigidBody[] {
        return this.bodies;
    }

    getManifolds(): ContactManifold[] {
        return this.manifolds;
    }

    addJoint(joint: Joint): void {
        this.joints.push(joint);
    }

    removeJoint(joint: Joint): void {
        for (let i = 0; i < this.joints.length; i++) {
            const current = this.joints[i];

            if (joint.id === current.id) {
                this.joints[i] = this.joints[this.joints.length - 1];
                this.joints.pop();
                return;
            }
        }
    }

    getJoints(): Joint[] {
        return this.joints;
    }

    addForce(force: Vec2): void {
        this.forces.push(force);
    }

    addTorque(torque: number): void {
        this.torques.push(torque);
    }

    update(dt: number): void {
        const bodies = this.bodies;

        // Loop all bodies of the world applying forces
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (SETTINGS.applyGravity) {
                // Apply the weight force to all bodies
                applyWeightForce(body, this.G * body.gravityScale);
            }

            // Apply forces to all bodies
            const forces = this.forces;
            for (let j = 0; j < forces.length; j++) {
                body.addForce(forces[j]);
            }

            // Apply torque to all bodiesx
            const torques = this.torques;
            for (let j = 0; j < torques.length; j++) {
                body.addTorque(torques[j]);
            }

            // Update last grounded time
            if (body.isGrounded) {
                body.lastGroundedTime = 0;
            } else {
                // Since we have fixed dt we can safely assume that the last frame dt is the same as this one
                body.lastGroundedTime += dt;
            }

            // Reset grounded value at the beginning of each frame
            body.isGrounded = false;
        }

        // Integrate all the forces
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.integrateForces(dt);
        }

        if (SETTINGS.ccd) {
            this.ccd(dt);

            for (let i = 0; i < this.dtFractions.length; i++) {
                const dtFraction = this.dtFractions[i];
                this.step(dtFraction);
            }
        } else {
            this.step(dt);
        }
    }

    private ccd(dt: number) {
        const fractions = this.dtFractions;
        fractions.length = 0;

        const bodies = this.bodies;

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];

            if (!body.isBullet) continue;

            if (body.velocity.magnitudeSquared() <= MIN_BULLET_SPEED_SQUARED) {
                body.isBullet = false;
                continue;
            }

            const fraction = CCD.resolveCCD(body, bodies, dt);

            if (fraction != null) {
                fractions[fractions.length] = fraction;
            }
        }

        fractions[fractions.length] = 1;
        fractions.sort((a, b) => a - b);

        let previous = 0;

        // Convert fractions to dt slices, the sum of the slices will be equal to dt
        for (let i = 0; i < fractions.length; i++) {
            const current = fractions[i] * dt;
            fractions[i] = current - previous;
            previous = current;
        }
    }

    private step(dt: number) {
        const bodies = this.bodies;
        const invDt = dt === 0 ? 0 : 1 / dt;

        this.broadPhase();

        this.narrowPhase();

        this.solveConstraints(invDt);

        // Integrate all the velocities
        if (dt !== 0) {
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                body.integrateVelocities(dt);
            }
        }
    }

    private broadPhase() {
        // Use insertion sort instead of Array.sort to exploit temporal coherence:
        // between frames, bodies move only slightly, so the array is already nearly sorted by minX.
        // In this case insertion sort runs in ~O(n) (only small local swaps),
        // while a full sort would still cost O(n log n).
        const bodies = this.bodies;

        for (let i = 1; i < bodies.length; i++) {
            const current = bodies[i];
            let j = i - 1;

            while (j >= 0 && bodies[j].minX > current.minX) {
                bodies[j + 1] = bodies[j];
                j--;
            }

            bodies[j + 1] = current;
        }

        this.potentialPairs.length = 0;

        // Broad phase check with prune & sweep algorithm
        for (let i = 0, len = bodies.length; i < len; i++) {
            const a = bodies[i];

            for (let j = i + 1; j < len; j++) {
                const b = bodies[j];

                // If objects don't overlap on X axis they cannot collide
                if (b.minX > a.maxX) break;

                // If objects overlap on X axis but don't overlap on Y axis the cannot collide
                if (a.maxY < b.minY || a.minY > b.maxY) {
                    continue;
                }

                if (!canCollide(a, b)) {
                    continue;
                }

                // Objects may be colliding
                this.potentialPairs.push(a, b);
            }
        }
    }

    private narrowPhase() {
        const oldManifolds = this.manifolds;

        const newManifolds = this.manifoldsNext;
        const newMap = this.manifoldMapNext;

        newManifolds.length = 0;
        newMap.clear();

        const pairs = this.potentialPairs;
        const oldMap = this.manifoldMap;
        const warmStarting = SETTINGS.warmStarting;

        // Narrow phase check, potential pairs may still not collide
        for (let i = 0; i < pairs.length; i += 2) {
            let a = pairs[i];
            let b = pairs[i + 1];

            if (a.isStatic() && b.isStatic()) continue;

            // Improve coherence
            if (a.id > b.id) {
                const tmp = a;
                a = b;
                b = tmp;
            }

            const newManifold = NarrowPhase.detectCollision(a, b);
            if (newManifold == null) continue;

            const key = Utils.pairKey(a, b);

            if (warmStarting) {
                const oldManifold = oldMap.get(key);
                if (oldManifold !== undefined) {
                    newManifold.tryWarmStart(oldManifold);
                }
            }

            newMap.set(key, newManifold);
            newManifolds.push(newManifold);

            this.setGrounded(newManifold);
        }

        for (let i = 0; i < oldManifolds.length; i++) {
            this.manifoldPool.release(oldManifolds[i]);
        }

        this.manifolds = newManifolds;
        this.manifoldsNext = oldManifolds;

        this.manifoldMap = newMap;
        this.manifoldMapNext = oldMap;
    }

    private solveConstraints(invDt: number) {
        // Presolve constraints
        for (let i = 0; i < this.manifolds.length; i++) this.manifolds[i].preSolve(invDt);

        for (let i = 0; i < this.joints.length; i++) this.joints[i].preSolve(invDt);

        // Solve constraints
        for (let i = 0; i < SETTINGS.solverIterations; i++) {
            for (let j = 0; j < this.manifolds.length; j++) this.manifolds[j].solve();

            for (let j = 0; j < this.joints.length; j++) this.joints[j].solve();
        }

        // Run contact callbacks
        for (let i = 0; i < this.manifolds.length; i++) {
            const manifold = this.manifolds[i];
            const bodyA = manifold.bodyA;
            const bodyB = manifold.bodyB;

            if (bodyA.onContact) {
                bodyA.onContact(manifold.contactInfo);
            }

            if (bodyB.onContact) {
                bodyB.onContact(manifold.contactInfo);
            }
        }
    }

    private setGrounded(manifold: ContactManifold) {
        const bodyA = manifold.bodyA;
        const bodyB = manifold.bodyB;
        const normalY = manifold.contactNormalY;

        if (!bodyA.isStatic() && normalY < -0.5) bodyA.isGrounded = true;
        if (!bodyB.isStatic() && normalY > 0.5) bodyB.isGrounded = true;
    }

    clear() {
        for (let i = 0; i < this.manifolds.length; i++) {
            this.manifoldPool.release(this.manifolds[i]);
        }

        this.bodies.length = 0;
        this.potentialPairs.length = 0;
        this.manifolds.length = 0;
        this.manifoldMap.clear();
        this.joints.length = 0;
        this.forces.length = 0;
        this.torques.length = 0;
    }
}
