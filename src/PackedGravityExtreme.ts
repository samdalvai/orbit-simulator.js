import { getBodyCount, mass, positionX, positionY } from './PackedBody';
import { applyForceOn, buildPackedQuadTree } from './PackedQuadTreeExtreme';
import { Vec2 } from './Vec2';

const DEFAULT_THETA = 0.5;
const DEFAULT_EPSILON = 1;

/**
 * Generates the gravitational force applied to `a` by `b`.
 */
// TODO: update using packed bodies
// export function generateGravitationalForce(a: Body, b: Body, G: number): Vec2 {
//     const dx = b.position.x - a.position.x;
//     const dy = b.position.y - a.position.y;
//     const distanceSquared = dx * dx + dy * dy;

//     if (distanceSquared === 0) {
//         return new Vec2();
//     }

//     const scale = (G * a.mass * b.mass) / (distanceSquared * Math.sqrt(distanceSquared));
//     return new Vec2(dx * scale, dy * scale);
// }

/**
 * Convenience version that applies all gravitational forces to all bodies.
 */
// TODO: update using packed bodies
// export function applyGravitationalForces(bodies: readonly Body[], G: number): void {
//     const force = new Vec2();

//     for (let i = 0; i < bodies.length - 1; i++) {
//         const a = bodies[i];

//         for (let j = i + 1; j < bodies.length; j++) {
//             const b = bodies[j];
//             const dx = b.position.x - a.position.x;
//             const dy = b.position.y - a.position.y;
//             const distanceSquared = dx * dx + dy * dy;

//             if (distanceSquared === 0) {
//                 continue;
//             }

//             const scale = (G * a.mass * b.mass) / (distanceSquared * Math.sqrt(distanceSquared));

//             force.x = dx * scale;
//             force.y = dy * scale;
//             a.addForce(force);

//             force.x = -force.x;
//             force.y = -force.y;
//             b.addForce(force);
//         }
//     }
// }

/**
 * Builds the global (packed) quadtree and applies one gravitational force per body.
 */
export function applyPackedBarnesHutGravitationalForces(
    G: number,
    theta = DEFAULT_THETA,
    epsilon = DEFAULT_EPSILON,
): void {
    if (!buildPackedQuadTree(theta, epsilon)) {
        return;
    }

    const thetaSquared = theta * theta;

    for (let i = 0; i < getBodyCount(); i++) {
        if (mass[i] === 0) continue;
        applyForceOn(i, positionX[i], positionY[i], G, thetaSquared);
    }
}
