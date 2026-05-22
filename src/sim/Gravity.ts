import { G, WEB_WORKERS_ENABLED } from '../shared/Constants';
import { Vec3 } from '../shared/Vec3';
import { addForce, getBodyCount, mass, positionX, positionY, positionZ } from './Body';
import { applyForceOn, buildOctree, nodeCount } from './OcTree';
import { runWorkerJob } from './Worker';

const DEFAULT_THETA = 0.5;
const DEFAULT_EPSILON = 1;

/**
 * Generates the gravitational force applied to `a` by `b`.
 */
export function generateGravitationalForce(aIndex: number, bIndex: number, G: number): Vec3 {
    const dx = positionX[bIndex] - positionX[aIndex];
    const dy = positionY[bIndex] - positionY[aIndex];
    const dz = positionZ[bIndex] - positionZ[aIndex];
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    if (distanceSquared === 0) {
        return new Vec3();
    }

    const scale = (G * mass[aIndex] * mass[bIndex]) / (distanceSquared * Math.sqrt(distanceSquared));
    return new Vec3(dx * scale, dy * scale, dz * scale);
}

/**
 * Convenience version that applies all gravitational forces to all bodies.
 */
export function applyGravitationalForces(): void {
    const force = new Vec3();
    const numBodies = getBodyCount();

    for (let i = 0; i < numBodies - 1; i++) {
        for (let j = i + 1; j < numBodies; j++) {
            const dx = positionX[j] - positionX[i];
            const dy = positionY[j] - positionY[i];
            const dz = positionZ[j] - positionZ[i];
            const distanceSquared = dx * dx + dy * dy + dz * dz;

            if (distanceSquared === 0) {
                continue;
            }

            const scale = (G * mass[i] * mass[j]) / (distanceSquared * Math.sqrt(distanceSquared));

            force.x = dx * scale;
            force.y = dy * scale;
            force.z = dz * scale;
            addForce(i, force);

            force.x = -force.x;
            force.y = -force.y;
            force.z = -force.z;
            addForce(j, force);
        }
    }
}

/**
 * Builds the global octree and applies one gravitational force per body.
 */
export async function applyBarnesHutGravitationalForces(
    worker: Worker | null,
    theta = DEFAULT_THETA,
    epsilon = DEFAULT_EPSILON,
): Promise<void> {
    if (!buildOctree(theta, epsilon)) {
        return;
    }

    const thetaSquared = theta * theta;
    const epsilonSquared = epsilon * epsilon;

    console.log('start: ', performance.now());

    if (WEB_WORKERS_ENABLED && worker) {
        //await Promise.all([])
        await runWorkerJob(worker, {
            type: 'applyForce',
            start: 0,
            end: getBodyCount(),
            G: G,
            thetaSq: thetaSquared,
            epsilonSquared: epsilonSquared,
            nodeCount: nodeCount,
        });
    } else {
        for (let i = 0; i < getBodyCount(); i++) {
            if (mass[i] === 0) continue;
            applyForceOn(i, positionX[i], positionY[i], positionZ[i], G, thetaSquared);
        }
    }

    console.log('end: ', performance.now());
}
