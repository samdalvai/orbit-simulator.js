import { G } from '../shared/Constants';
import {
    aabbMaxX,
    aabbMaxY,
    aabbMinX,
    aabbMinY,
    clearBodies,
    clearForces,
    getBodyCount,
    initializeAcceleration,
    integrateVerletPosition,
    integrateVerletVelocity,
    swapBodies,
} from './Body';
import { detectCircleCollision, resolvePosition, resolveCollision as resolveVelocity } from './Collision';
import { applyBarnesHutGravitationalForces } from './Gravity';

const POSITION_ITERATIONS = 4;
const VELOCITY_ITERATIONS = 1;

export class Engine {
    private readonly collisionPairs: [number, number][] = [];

    update(dt: number): void {
        const bodyCount = getBodyCount();

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletPosition(i, dt);
        }

        this.broadPhase();
        this.solvePositions();

        this.clearAllForces();
        applyBarnesHutGravitationalForces(G);

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletVelocity(i, dt);
        }

        this.solveVelocities();
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
        this.collisionPairs.length = 0;
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

                // Objects may be colliding
                this.collisionPairs.push([i, j]);

                //     // TODO: do something with impact energy, e.g. explode planets
                //     // const impact = computeImpactEnergy(a, b, collision.normal);

                //     // TODO: explode planets in some cases, in other cases merge them
                //     // E.g. if mass difference is high enough the smaller planet/body should be merged in the bigger one
                //     // if energy impact is high enough and there is not enough mass difference we can explode planets
            }
        }
    }

    private solvePositions() {
        const pairs = this.collisionPairs;

        for (let iter = 0; iter < POSITION_ITERATIONS; iter++) {
            for (const [aIndex, bIndex] of pairs) {
                const collision = detectCircleCollision(aIndex, bIndex);
                if (!collision) continue;

                resolvePosition(aIndex, bIndex, collision, 0.5);
            }
        }
    }

    private solveVelocities() {
        const pairs = this.collisionPairs;

        for (let iter = 0; iter < VELOCITY_ITERATIONS; iter++) {
            for (const [aIndex, bIndex] of pairs) {
                const collision = detectCircleCollision(aIndex, bIndex);
                if (!collision) continue;

                resolveVelocity(aIndex, bIndex, collision);
            }
        }
    }

    clear() {
        clearBodies();
    }
}
