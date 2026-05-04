import { Body } from './Body';
import { detectCircleCollision, positionalCorrection, resolveCollision } from './Collision';
import { G, MAX_BODIES } from './Constants';
import {
    NO_PARENT,
    addNewBody,
    clearBodies,
    clearForces,
    getBodyCount,
    initializeAcceleration,
    integrateVerletPosition,
    integrateVerletVelocity,
    maxX,
    maxY,
    minX,
    minY,
    removeBody,
    swapBodies,
} from './PackedBody';
import { applyPackedBarnesHutGravitationalForces } from './PackedGravityExtreme';
import { Vec2 } from './Vec2';

export class Engine {
    private forces: Vec2[] = [];

    addBody(body: Body): number | null {
        if (getBodyCount() >= MAX_BODIES) return null;

        const packedId = addNewBody(
            body.position.x,
            body.position.y,
            body.radius,
            body.mass,
            body.bodyType,
            body.velocity,
            body.parent ? body.parent.id : NO_PARENT,
        );

        return packedId;
    }

    deleteBody(bodyId: number): number {
        return removeBody(bodyId);
    }

    getBodiesCount(): number {
        return getBodyCount();
    }

    addForce(force: Vec2): void {
        this.forces.push(force);
    }

    update(dt: number): void {
        const bodyCount = getBodyCount();

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletPosition(i, dt);
        }

        this.clearAllForces();
        applyPackedBarnesHutGravitationalForces(G);

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletVelocity(i, dt);
        }

        // TODO: Skipped for now
        this.broadPhase();
    }

    initializeVerlet(): void {
        this.clearAllForces();
        applyPackedBarnesHutGravitationalForces(G);

        for (let i = 0; i < getBodyCount(); i++) {
            initializeAcceleration(i);
        }
    }

    clearAllForces() {
        for (let i = 0; i < getBodyCount(); i++) {
            clearForces(i);
        }
    }

    private broadPhase() {
        // Use insertion sort instead of Array.sort to exploit temporal coherence:
        // between frames, bodies move only slightly, so the array is already nearly sorted by minX.
        // In this case insertion sort runs in ~O(n) (only small local swaps),
        // while a full sort would still cost O(n log n).
        const count = getBodyCount();

        for (let i = 1; i < count; i++) {
            const minXCurrent = minX[i];
            let j = i - 1;

            while (j >= 0 && minX[j] > minXCurrent) {
                swapBodies(j + 1, j);
                j--;
            }
        }

        // Broad phase check with prune & sweep algorithm
        for (let i = 0, len = count; i < len; i++) {
            const maxXCurrent = maxX[i];
            const minYCurrent = minY[i];
            const maxYCurrent = maxY[i];

            for (let j = i + 1; j < len; j++) {
                // If objects don't overlap on X axis they cannot collide
                if (minX[j] > maxXCurrent) break;

                // If objects overlap on X axis but don't overlap on Y axis the cannot collide
                if (maxYCurrent < minY[j] || minYCurrent > maxY[j]) {
                    continue;
                }

                // Objects may be colliding: resolve collision
                // const collision = detectCircleCollision(a, b);

                // if (collision) {
                //     resolveCollision(a, b, collision, 0.2);
                //     positionalCorrection(a, b, collision);

                //     // TODO: do something with impact energy, e.g. explode planets
                //     // const impact = computeImpactEnergy(a, b, collision.normal);
                // }
            }
        }
    }

    clear() {
        this.forces.length = 0;
        clearBodies();
    }
}
