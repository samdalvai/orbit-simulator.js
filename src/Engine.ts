import { Body } from './Body';
import { G, MAX_BODIES } from './Constants';
import { applyGravitationalForces } from './Gravity';
import { Vec2 } from './Vec2';

export class Engine {
    private bodies: Body[] = [];
    /** Pairs are allocated in blocks of 2 */
    private potentialPairs: Body[] = [];

    private forces: Vec2[] = [];
    private torques: number[] = [];

    constructor() {
        //
    }

    addBody(body: Body): void {
        if (this.bodies.length >= MAX_BODIES) return;

        this.bodies.push(body);
    }

    removeBody(body: Body): void {
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

    getBodies(): Body[] {
        return this.bodies;
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

            // Apply forces to all bodies
            const forces = this.forces;
            for (let j = 0; j < forces.length; j++) {
                body.addForce(forces[j]);
            }
        }

        // Apply gravity
        // TODO: is this the right place?
        applyGravitationalForces(this.bodies, G);

        // this.broadPhase();

        // Integrate all the forces
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.integrateForces(dt);
        }

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.integrateVelocities(dt);
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

                // Objects may be colliding
                this.potentialPairs.push(a, b);
            }
        }
    }

    clear() {
        this.potentialPairs.length = 0;
        this.bodies.length = 0;
        this.forces.length = 0;
    }
}
