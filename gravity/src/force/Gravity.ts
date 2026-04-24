import { PIXELS_PER_METER } from '../core/Constants';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { QuadNode, buildQuadTree, canApproximate } from './QuadTree';

export function generateWeightForce(body: RigidBody, G: number): Vec2 {
    const weightForce = new Vec2(0.0, body.mass * G * PIXELS_PER_METER);
    return weightForce;
}

export function applyWeightForce(body: RigidBody, G: number): void {
    const weigthForce = body.mass * G * PIXELS_PER_METER;
    body.addForceY(weigthForce);
}

/**
 * Generates an inverse-square gravitational attraction force between two bodies.
 *
 * The force is proportional to 1 / r^2, so we clamp `distanceSquared` before dividing by it.
 *
 * Example:
 * - if `minDistanceSquared = 80 * 80` and the bodies are only 20 px apart, we still use 80 px
 * - if `maxDistanceSquared = 950 * 950` and the bodies are 1400 px apart, we still use 950 px
 *
 * This avoids very large forces near the center and very tiny forces far away.
 */
export function generateGravitationalForce(
    a: RigidBody,
    b: RigidBody,
    G: number,
    minDistanceSquared: number,
    maxDistanceSquared: number,
): Vec2 {
    // Calculate the distance between the two objects
    const d = b.position.subNew(a.position);

    let distanceSquared = d.magnitudeSquared();

    // Clamp the squared distance so the resulting force stays within a tunable range.
    distanceSquared = Math.min(Math.max(distanceSquared, minDistanceSquared), maxDistanceSquared);

    // Calculate the direction of the attraction force
    const attractionDirection = d.unitVector();

    // Calculate the strength of the attraction force
    const attractionMagnitude = (G * (a.mass * b.mass)) / distanceSquared;

    // Calculate the final resulting attraction force vector
    return attractionDirection.scaleNew(attractionMagnitude);
}

/**
 * Convenience version that applies all gravitational forces to all bodies
 */
export function applyGravitationalForces(
    bodies: readonly RigidBody[],
    G: number,
    minDistanceSquared: number,
    maxDistanceSquared: number,
): void {
    for (let i = 0; i < bodies.length - 1; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            const attraction = generateGravitationalForce(a, b, G, minDistanceSquared, maxDistanceSquared);
            a.addForce(attraction);
            b.addForce(attraction.negateNew());
        }
    }
}

/**
 * Computes the gravitational force on one body by traversing a Barnes-Hut quadtree.
 *
 * Use `theta = 0` to disable approximation and recover the exact pairwise sum.
 * Smaller `theta` is more accurate, larger `theta` is faster.
 */
export function generateBarnesHutGravitationalForce(
    body: RigidBody,
    tree: QuadNode | null,
    G: number,
    minDistanceSquared: number,
    maxDistanceSquared: number,
    theta = 0.5,
): Vec2 {
    if (tree === null || body.mass === 0) {
        return new Vec2();
    }

    const force = new Vec2();
    accumulateGravitationalForce(force, body, tree, G, minDistanceSquared, maxDistanceSquared, theta);
    return force;
}

function accumulateGravitationalForce(
    force: Vec2,
    body: RigidBody,
    node: QuadNode,
    G: number,
    minDistanceSquared: number,
    maxDistanceSquared: number,
    theta: number,
): void {
    if (node.bodyCount === 0 || node.totalMass === 0) {
        return;
    }

    if (node.children === null) {
        for (let i = 0; i < node.bodies.length; i++) {
            const other = node.bodies[i];
            if (other.id === body.id) continue;
            force.addAssign(generateGravitationalForce(body, other, G, minDistanceSquared, maxDistanceSquared));
        }
        return;
    }

    if (canApproximate(node, body, theta)) {
        const dx = node.centerOfMassX - body.position.x;
        const dy = node.centerOfMassY - body.position.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared !== 0) {
            const clampedDistanceSquared = Math.min(Math.max(distanceSquared, minDistanceSquared), maxDistanceSquared);
            const inverseDistance = 1 / Math.sqrt(distanceSquared);
            const magnitude = (G * body.mass * node.totalMass) / clampedDistanceSquared;
            force.x += dx * inverseDistance * magnitude;
            force.y += dy * inverseDistance * magnitude;
        }

        return;
    }

    for (let i = 0; i < node.children.length; i++) {
        accumulateGravitationalForce(force, body, node.children[i], G, minDistanceSquared, maxDistanceSquared, theta);
    }
}

/**
 * Convenience version that builds the tree once and applies one gravitational force per body.
 */
export function applyBarnesHutGravitationalForces(
    bodies: readonly RigidBody[],
    G: number,
    minDistanceSquared: number,
    maxDistanceSquared: number,
    theta = 0.5,
): void {
    const tree = buildQuadTree(bodies, 'gravity');

    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const force = generateBarnesHutGravitationalForce(b, tree, G, minDistanceSquared, maxDistanceSquared, theta);

        b.addForce(force);
    }
}
