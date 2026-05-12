import { Body } from './Body';
import { detectCircleCollision, positionalCorrection, resolveCollision } from './Collision';
import { G, MAX_BODIES } from './Constants';
import { applyBarnesHutGravitationalForces } from './Gravity';
import { Vec2 } from './Vec2';

export class Engine {
    private bodies: Body[] = [];

    private forces: Vec2[] = [];

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

    getBodiesCount(): number {
        return this.bodies.length;
    }

    addForce(force: Vec2): void {
        this.forces.push(force);
    }

    update(dt: number): void {
        const bodies = this.bodies;

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.integrateVerletPosition(dt);
        }

        this.clearAllForces();
        applyBarnesHutGravitationalForces(this.bodies, G);

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.integrateVerletVelocity(dt);
        }

        this.broadPhase();
    }

    initializeVerlet(): void {
        this.clearAllForces();
        applyBarnesHutGravitationalForces(this.bodies, G);

        const bodies = this.bodies;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.initializeAcceleration();
        }
    }

    clearAllForces() {
        const bodies = this.bodies;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            body.clearForces();
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

                // Objects may be colliding: resolve collision
                const collision = detectCircleCollision(a, b);

                if (collision) {
                    resolveCollision(a, b, collision, 0.2);
                    positionalCorrection(a, b, collision);

                    // TODO: do something with impact energy, e.g. explode planets
                    // const impact = computeImpactEnergy(a, b, collision.normal);
                }
            }
        }
    }

    clear() {
        this.bodies.length = 0;
        this.forces.length = 0;
    }
}
