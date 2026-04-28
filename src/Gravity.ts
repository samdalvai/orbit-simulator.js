import { Body } from './Body';
import { QuadTree, buildQuadTree } from './QuadTree';
import { Vec2 } from './Vec2';

const DEFAULT_THETA = 0.5;
const DEFAULT_EPSILON = 1;

/**
 * Generates the gravitational force applied to `a` by `b`.
 */
export function generateGravitationalForce(a: Body, b: Body, G: number): Vec2 {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) {
        return new Vec2();
    }

    const scale = (G * a.mass * b.mass) / (distanceSquared * Math.sqrt(distanceSquared));
    return new Vec2(dx * scale, dy * scale);
}

/**
 * Convenience version that applies all gravitational forces to all bodies.
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
 * Computes the gravitational force on one body by traversing a flat Barnes-Hut quadtree.
 *
 * Use `theta = 0` to disable approximation and recover the exact tree traversal.
 */
export function generateBarnesHutGravitationalForce(
    body: Body,
    tree: QuadTree | null,
    G: number,
    theta?: number,
): Vec2 {
    if (tree === null || body.mass === 0) {
        return new Vec2();
    }

    const thetaSquared = theta === undefined ? tree.thetaSquared : theta * theta;
    return tree.forceOn(body, G, new Vec2(), thetaSquared);
}

/**
 * Convenience version that builds the tree once and applies one gravitational force per body.
 */
export function applyBarnesHutGravitationalForces(
    bodies: readonly Body[],
    G: number,
    theta = DEFAULT_THETA,
    epsilon = DEFAULT_EPSILON,
): void {
    const tree = buildQuadTree(bodies, theta, epsilon);

    if (tree === null) {
        return;
    }

    const force = new Vec2();
    const thetaSquared = theta * theta;

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.mass === 0) continue;

        tree.forceOn(body, G, force, thetaSquared);
        body.addForce(force);
    }
}
