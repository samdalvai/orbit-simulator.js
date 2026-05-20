import { G } from '../shared/Constants';
import { BodyRenderStyle } from '../view/BodyRenderStyle';
import {
    aabbMaxX,
    aabbMaxY,
    aabbMaxZ,
    aabbMinX,
    aabbMinY,
    aabbMinZ,
    bodyIds,
    clearBodies,
    clearForces,
    getBodyCount,
    initializeAcceleration,
    integrateVerletPosition,
    integrateVerletVelocity,
    mass,
    swapBodies,
} from './Body';
import {
    computeImpactEnergy,
    detectCircleCollision,
    explodeBody,
    resolvePosition,
    resolveCollision as resolveVelocity,
} from './Collision';
import { applyBarnesHutGravitationalForces } from './Gravity';

const DESTROY_THRESHOLD = 1e-1;
export class Engine {
    private bodyRenderStyles: Map<number, BodyRenderStyle>;
    private readonly collisionPairs: [number, number][] = [];

    constructor(bodyRenderStyles: Map<number, BodyRenderStyle>) {
        this.bodyRenderStyles = bodyRenderStyles;
    }

    update(dt: number): void {
        const bodyCount = getBodyCount();

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletPosition(i, dt);
        }

        this.broadPhase();

        this.clearAllForces();
        applyBarnesHutGravitationalForces(G);

        for (let i = 0; i < bodyCount; i++) {
            integrateVerletVelocity(i, dt);
        }
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

            const minZCurrent = aabbMinZ[i];
            const maxZCurrent = aabbMaxZ[i];

            for (let j = i + 1; j < len; j++) {
                // If objects don't overlap on X axis they cannot collide
                if (aabbMinX[j] > maxXCurrent) break;

                // If objects overlap on X axis but don't overlap on Y axis the cannot collide
                if (maxYCurrent < aabbMinY[j] || minYCurrent > aabbMaxY[j]) {
                    continue;
                }

                // If objects overlap on X and Y axis but don't overlap on Z axis the cannot collide
                if (maxZCurrent < aabbMinZ[j] || minZCurrent > aabbMaxZ[j]) {
                    continue;
                }

                // Objects may be colliding
                const collision = detectCircleCollision(i, j);

                if (collision) {
                    resolvePosition(i, j, collision, 1);
                    resolveVelocity(i, j, collision);

                    const impactEnergy = computeImpactEnergy(i, j, collision.normal);
                    const energyPerKgA = impactEnergy / mass[i];
                    const energyPerKgB = impactEnergy / mass[j];

                    if (energyPerKgA > DESTROY_THRESHOLD) explodeBody(bodyIds[i], this.bodyRenderStyles);
                    if (energyPerKgB > DESTROY_THRESHOLD) explodeBody(bodyIds[j], this.bodyRenderStyles);
                }
            }
        }
    }

    clear() {
        clearBodies();
    }
}
