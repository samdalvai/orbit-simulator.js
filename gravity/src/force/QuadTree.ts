import { RigidBody } from '../core/RigidBody';

const MIN_NODE_HALF_SIZE = 1;

export type QuadNodeKind = 'gravity' | 'coulomb' | 'combined';

export type QuadNode = {
    centerX: number;
    centerY: number;
    halfSize: number;
    bodyCount: number;
    totalMass: number;
    centerOfMassX: number;
    centerOfMassY: number;
    positiveCharge: number;
    positiveChargeX: number;
    positiveChargeY: number;
    negativeCharge: number;
    negativeChargeX: number;
    negativeChargeY: number;
    bodies: RigidBody[];
    children: QuadNode[] | null;
};

/**
 * Builds a quadtree once and stores the aggregates needed by Barnes-Hut.
 *
 * The same tree can be reused for:
 * - gravity, using the node mass and center of mass
 * - Coulomb forces, using separate positive/negative charge aggregates
 *
 * Use `kind` to keep the tree focused on the force you want to compute:
 * - `gravity`: insert only bodies with mass
 * - `coulomb`: insert only charged bodies
 * - `combined`: insert bodies that matter for either force
 */
export function buildQuadTree(bodies: readonly RigidBody[], kind: QuadNodeKind = 'combined'): QuadNode | null {
    let hasContributor = false;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!bodyContributesToTree(body, kind)) continue;

        const x = body.position.x;
        const y = body.position.y;

        if (!hasContributor) {
            minX = x;
            maxX = x;
            minY = y;
            maxY = y;
            hasContributor = true;
            continue;
        }

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    if (!hasContributor) {
        return null;
    }

    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const halfSize = Math.max((maxX - minX) * 0.5, (maxY - minY) * 0.5, MIN_NODE_HALF_SIZE) + 1;

    const root = createNode(centerX, centerY, halfSize);

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!bodyContributesToTree(body, kind)) continue;
        insertBody(root, body);
    }

    return root;
}

function createNode(centerX: number, centerY: number, halfSize: number): QuadNode {
    return {
        centerX,
        centerY,
        halfSize,
        bodyCount: 0,
        totalMass: 0,
        centerOfMassX: 0,
        centerOfMassY: 0,
        positiveCharge: 0,
        positiveChargeX: 0,
        positiveChargeY: 0,
        negativeCharge: 0,
        negativeChargeX: 0,
        negativeChargeY: 0,
        bodies: [],
        children: null,
    };
}

function bodyContributesToTree(body: RigidBody, kind: QuadNodeKind): boolean {
    if (kind === 'gravity') {
        return body.mass !== 0;
    }

    if (kind === 'coulomb') {
        return body.charge !== 0;
    }

    return body.mass !== 0 || body.charge !== 0;
}

function insertBody(node: QuadNode, body: RigidBody): void {
    node.bodyCount++;
    updateAggregates(node, body);

    if (node.children !== null) {
        insertBody(node.children[getChildIndex(node, body)], body);
        return;
    }

    if (node.bodies.length === 0) {
        node.bodies.push(body);
        return;
    }

    // Keep near-identical bodies together once the node becomes very small.
    if (node.halfSize <= MIN_NODE_HALF_SIZE || allBodiesSharePosition(node.bodies, body)) {
        node.bodies.push(body);
        return;
    }

    subdivide(node);
    const children = node.children!;

    const bodiesToReinsert = node.bodies;
    node.bodies = [];

    for (let i = 0; i < bodiesToReinsert.length; i++) {
        const current = bodiesToReinsert[i];
        insertBody(children[getChildIndex(node, current)], current);
    }

    insertBody(children[getChildIndex(node, body)], body);
}

function updateAggregates(node: QuadNode, body: RigidBody): void {
    if (body.mass !== 0) {
        const nextTotalMass = node.totalMass + body.mass;
        node.centerOfMassX =
            nextTotalMass === 0
                ? 0
                : (node.centerOfMassX * node.totalMass + body.position.x * body.mass) / nextTotalMass;
        node.centerOfMassY =
            nextTotalMass === 0
                ? 0
                : (node.centerOfMassY * node.totalMass + body.position.y * body.mass) / nextTotalMass;
        node.totalMass = nextTotalMass;
    }

    if (body.charge > 0) {
        const nextPositiveCharge = node.positiveCharge + body.charge;
        node.positiveChargeX =
            nextPositiveCharge === 0
                ? 0
                : (node.positiveChargeX * node.positiveCharge + body.position.x * body.charge) / nextPositiveCharge;
        node.positiveChargeY =
            nextPositiveCharge === 0
                ? 0
                : (node.positiveChargeY * node.positiveCharge + body.position.y * body.charge) / nextPositiveCharge;
        node.positiveCharge = nextPositiveCharge;
        return;
    }

    if (body.charge < 0) {
        const chargeMagnitude = -body.charge;
        const nextNegativeCharge = node.negativeCharge + chargeMagnitude;
        node.negativeChargeX =
            nextNegativeCharge === 0
                ? 0
                : (node.negativeChargeX * node.negativeCharge + body.position.x * chargeMagnitude) / nextNegativeCharge;
        node.negativeChargeY =
            nextNegativeCharge === 0
                ? 0
                : (node.negativeChargeY * node.negativeCharge + body.position.y * chargeMagnitude) / nextNegativeCharge;
        node.negativeCharge = nextNegativeCharge;
    }
}

function allBodiesSharePosition(bodies: readonly RigidBody[], body: RigidBody): boolean {
    for (let i = 0; i < bodies.length; i++) {
        const current = bodies[i];
        if (current.position.x !== body.position.x || current.position.y !== body.position.y) {
            return false;
        }
    }

    return true;
}

function subdivide(node: QuadNode): void {
    const childHalfSize = node.halfSize * 0.5;
    node.children = [
        createNode(node.centerX - childHalfSize, node.centerY - childHalfSize, childHalfSize),
        createNode(node.centerX + childHalfSize, node.centerY - childHalfSize, childHalfSize),
        createNode(node.centerX - childHalfSize, node.centerY + childHalfSize, childHalfSize),
        createNode(node.centerX + childHalfSize, node.centerY + childHalfSize, childHalfSize),
    ];
}

function getChildIndex(node: QuadNode, body: RigidBody): number {
    const east = body.position.x >= node.centerX ? 1 : 0;
    const south = body.position.y >= node.centerY ? 2 : 0;
    return east + south;
}

export function canApproximate(node: QuadNode, body: RigidBody, theta: number): boolean {
    if (theta <= 0 || bodyIsInsideNode(node, body)) {
        return false;
    }

    const dx = node.centerX - body.position.x;
    const dy = node.centerY - body.position.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared === 0) {
        return false;
    }

    const size = node.halfSize * 2;
    return size * size < theta * theta * distanceSquared;
}

function bodyIsInsideNode(node: QuadNode, body: RigidBody): boolean {
    const x = body.position.x;
    const y = body.position.y;

    return (
        x >= node.centerX - node.halfSize &&
        x <= node.centerX + node.halfSize &&
        y >= node.centerY - node.halfSize &&
        y <= node.centerY + node.halfSize
    );
}
