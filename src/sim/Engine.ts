import { detectCircleCollision, positionalCorrection, resolveCollision } from './Collision';
import { G } from '../shared/Constants';
import {
    clearBodies,
    clearForces,
    getBodyCount,
    initializeAcceleration,
    integrateVerletPosition,
    integrateVerletVelocity,
    aabbMaxX,
    aabbMaxY,
    aabbMinX,
    aabbMinY,
    swapBodies,
} from './Body';
import { applyBarnesHutGravitationalForces } from './Gravity';

export class Engine {
    update(dt: number): void {
        const bodyCount = getBodyCount();

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletPosition(i, dt);
        }

        this.clearAllForces();
        applyBarnesHutGravitationalForces(G);

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletVelocity(i, dt);
        }

        this.broadPhase();
    }

    initializeVerlet(): void {
        this.clearAllForces();
        applyBarnesHutGravitationalForces(G);

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
            const minXCurrent = aabbMinX[i];
            let j = i - 1;

            while (j >= 0 && aabbMinX[j] > minXCurrent) {
                swapBodies(j + 1, j);
                j--;
            }
        }

        // Broad phase check with prune & sweep algorithm
        for (let i = 0, len = count; i < len; i++) {
            const maxXCurrent = aabbMaxX[i];
            const minYCurrent = aabbMinY[i];
            const maxYCurrent = aabbMaxY[i];

            for (let j = i + 1; j < len; j++) {
                // If objects don't overlap on X axis they cannot collide
                if (aabbMinX[j] > maxXCurrent) break;

                // If objects overlap on X axis but don't overlap on Y axis the cannot collide
                if (maxYCurrent < aabbMinY[j] || minYCurrent > aabbMaxY[j]) {
                    continue;
                }

                // Objects may be colliding: resolve collision
                const collision = detectCircleCollision(i, j);

                if (collision) {
                    resolveCollision(i, j, collision, 0.2);
                    positionalCorrection(i, j, collision);

                    // TODO: do something with impact energy, e.g. explode planets
                    // const impact = computeImpactEnergy(a, b, collision.normal);

                    // TODO: explode planets in some cases, in other cases merge them
                    // E.g. if mass difference is high enough the smaller planet/body should be merged in the bigger one
                    // if energy impact is high enough and there is not enough mass difference we can explode planets
                }
            }
        }
    }

    clear() {
        clearBodies();
    }
}
