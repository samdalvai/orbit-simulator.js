import { addForce, getBodyCount, mass, positionX, positionY } from './Body';
import { applyForceOn, buildQuadTree } from './QuadTree';
import { Vec2 } from '../shared/Vec2';

const DEFAULT_THETA = 0.5;
const DEFAULT_EPSILON = 1;

/**
 * Generates the gravitational force applied to `a` by `b`.
 */
export function generateGravitationalForce(aIndex: number, bIndex: number, G: number): Vec2 {
    const dx = positionX[bIndex] - positionX[aIndex];
    const dy = positionY[bIndex] - positionY[aIndex];
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) {
        return new Vec2();
    }

    const scale = (G * mass[aIndex] * mass[bIndex]) / (distanceSquared * Math.sqrt(distanceSquared));
    return new Vec2(dx * scale, dy * scale);
}

/**
 * Convenience version that applies all gravitational forces to all bodies.
 */
export function applyGravitationalForces(G: number): void {
    const force = new Vec2();
    const numBodies = getBodyCount();

    for (let i = 0; i < numBodies - 1; i++) {
        for (let j = i + 1; j < numBodies; j++) {
            const dx = positionX[j] - positionX[i];
            const dy = positionY[j] - positionY[i];
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared === 0) {
                continue;
            }

            const scale = (G * mass[i] * mass[j]) / (distanceSquared * Math.sqrt(distanceSquared));

            force.x = dx * scale;
            force.y = dy * scale;
            addForce(i, force);

            force.x = -force.x;
            force.y = -force.y;
            addForce(j, force);
        }
    }
}

/**
 * Builds the global () quadtree and applies one gravitational force per body.
 */
export function applyBarnesHutGravitationalForces(G: number, theta = DEFAULT_THETA, epsilon = DEFAULT_EPSILON): void {
    if (!buildQuadTree(theta, epsilon)) {
        return;
    }

    const thetaSquared = theta * theta;

    for (let i = 0; i < getBodyCount(); i++) {
        if (mass[i] === 0) continue;
        applyForceOn(i, positionX[i], positionY[i], G, thetaSquared);
    }
}
