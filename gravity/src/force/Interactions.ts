import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { QuadNode, buildQuadTree, canApproximate } from './QuadTree';

export function generateExplosionForce(body: RigidBody, explosionSource: Vec2, radius: number, strength: number): Vec2 {
    // Static bodies don't explode
    if (body.invMass === 0) return new Vec2();

    const dir = body.position.subNew(explosionSource);
    const dist = dir.magnitude();

    // If body is farther than radius, explosion force is 0
    if (dist > radius || dist === 0) return new Vec2();

    // Normalize direction
    dir.scaleAssign(1 / dist);

    // Falloff: weaker at distance
    const falloff = 1 - dist / radius;

    const impulseMag = strength * falloff;

    const impulse = dir.scaleNew(impulseMag);
    return impulse;
}

export function generateCoulombForce(bodyA: RigidBody, bodyB: RigidBody, k: number): Vec2 {
    const q1 = bodyA.charge;
    const q2 = bodyB.charge;

    if (q1 === 0 || q2 === 0) {
        return new Vec2(0, 0);
    }

    const dx = bodyB.position.x - bodyA.position.x;
    const dy = bodyB.position.y - bodyA.position.y;

    const distSq = dx * dx + dy * dy;
    if (distSq === 0) {
        return new Vec2(0, 0);
    }

    // Softening to avoid singularity
    const epsilon = 0.01;
    const safeDistSq = distSq + epsilon;

    const invDist = 1 / Math.sqrt(safeDistSq);
    const dirX = dx * invDist;
    const dirY = dy * invDist;

    // Signed scalar handles attraction/repulsion
    const forceScalar = (-k * (q1 * q2)) / safeDistSq;

    return new Vec2(dirX * forceScalar, dirY * forceScalar);
}

/**
 * Convenience version that applies all voulomb forces to all bodies
 */
export function applyCoulombForces(bodies: readonly RigidBody[], k: number): void {
    for (let i = 0; i < bodies.length - 1; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            const coulombForce = generateCoulombForce(a, b, k);
            a.addForce(coulombForce);
            b.addForce(coulombForce.negateNew());
        }
    }
}

/**
 * Computes the Coulomb force on one body by traversing a Barnes-Hut quadtree.
 *
 * Positive and negative charges are aggregated separately so mixed-charge cells
 * can still be approximated without collapsing everything into a single net charge.
 *
 * Use `theta = 0` to disable approximation and recover the exact pairwise sum.
 * Smaller `theta` is more accurate, larger `theta` is faster.
 */
export function generateBarnesHutCoulombForce(
    body: RigidBody,
    tree: QuadNode | null,
    k: number,
    theta = 0.5,
    epsilon = 0.01,
): Vec2 {
    if (tree === null || body.charge === 0) {
        return new Vec2();
    }

    const force = new Vec2();
    accumulateCoulombForce(force, body, tree, k, theta, epsilon);
    return force;
}

/**
 * Convenience version that builds the tree once applies one Coulomb force per body.
 */
export function applyBarnesHutCoulombForces(
    bodies: readonly RigidBody[],
    k: number,
    theta = 0.5,
    epsilon = 0.01,
): void {
    const tree = buildQuadTree(bodies, 'coulomb');

    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const force = generateBarnesHutCoulombForce(b, tree, k, theta, epsilon);
        b.addForce(force);
    }
}

function accumulateCoulombForce(
    force: Vec2,
    body: RigidBody,
    node: QuadNode,
    k: number,
    theta: number,
    epsilon: number,
): void {
    if (node.bodyCount === 0 || (node.positiveCharge === 0 && node.negativeCharge === 0)) {
        return;
    }

    if (node.children === null) {
        for (let i = 0; i < node.bodies.length; i++) {
            const other = node.bodies[i];
            if (other.id === body.id) continue;
            addChargeForce(force, body, other.charge, other.position.x, other.position.y, k, epsilon);
        }
        return;
    }

    if (canApproximate(node, body, theta)) {
        if (node.positiveCharge !== 0) {
            addChargeForce(force, body, node.positiveCharge, node.positiveChargeX, node.positiveChargeY, k, epsilon);
        }

        if (node.negativeCharge !== 0) {
            addChargeForce(force, body, -node.negativeCharge, node.negativeChargeX, node.negativeChargeY, k, epsilon);
        }

        return;
    }

    for (let i = 0; i < node.children.length; i++) {
        accumulateCoulombForce(force, body, node.children[i], k, theta, epsilon);
    }
}

function addChargeForce(
    force: Vec2,
    body: RigidBody,
    clusterCharge: number,
    sourceX: number,
    sourceY: number,
    k: number,
    epsilon: number,
): void {
    const dx = sourceX - body.position.x;
    const dy = sourceY - body.position.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) {
        return;
    }

    const safeDistanceSquared = distanceSquared + epsilon;
    const inverseDistance = 1 / Math.sqrt(safeDistanceSquared);
    const forceScalar = (-k * (body.charge * clusterCharge)) / safeDistanceSquared;

    force.x += dx * inverseDistance * forceScalar;
    force.y += dy * inverseDistance * forceScalar;
}
