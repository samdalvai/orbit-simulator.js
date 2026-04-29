import { Body } from './Body';
import { buildQuadTree, forceOn } from './QuadTree';
import { Vec2 } from './Vec2';

const DEFAULT_THETA = 0.5;
const DEFAULT_EPSILON = 1;

/**
 * Convenience version that applies all gravitational forces to all bodies.
 * (Naive n^2 version)
 */
export function applyGravitationalForces(bodies: readonly Body[], G: number): void {
    const force = new Vec2();

    for (let i = 0; i < bodies.length - 1; i++) {
        const a = bodies[i];

        for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared === 0) {
                continue;
            }

            const scale = (G * a.mass * b.mass) / (distanceSquared * Math.sqrt(distanceSquared));

            force.x = dx * scale;
            force.y = dy * scale;
            a.addForce(force);

            force.x = -force.x;
            force.y = -force.y;
            b.addForce(force);
        }
    }
}

/**
 * Builds the global (packed) quadtree and applies one gravitational force per body.
 */
export function applyBarnesHutGravitationalForces(
    bodies: readonly Body[],
    G: number,
    theta = DEFAULT_THETA,
    epsilon = DEFAULT_EPSILON,
): void {
    if (!buildQuadTree(bodies, theta, epsilon)) {
        return;
    }

    const force = new Vec2();
    const thetaSquared = theta * theta;

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.mass === 0) continue;

        forceOn(body, G, force, thetaSquared);
        body.addForce(force);
    }
}
