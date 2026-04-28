import { Body } from './Body';
import { MAX_BODIES } from './Constants';
import { Vec2 } from './Vec2';

export const PACKED_ROOT = 0;
export const PACKED_PARENT_CAPACITY = MAX_BODIES;
export const PACKED_NODE_CAPACITY = MAX_BODIES * 4;

export const packedChildren = new Uint32Array(PACKED_NODE_CAPACITY);
export const packedNext = new Uint32Array(PACKED_NODE_CAPACITY);
export const packedPosX = new Float64Array(PACKED_NODE_CAPACITY);
export const packedPosY = new Float64Array(PACKED_NODE_CAPACITY);
export const packedMass = new Float64Array(PACKED_NODE_CAPACITY);
export const packedCenterX = new Float64Array(PACKED_NODE_CAPACITY);
export const packedCenterY = new Float64Array(PACKED_NODE_CAPACITY);
export const packedSize = new Float64Array(PACKED_NODE_CAPACITY);
export const packedParents = new Uint32Array(PACKED_PARENT_CAPACITY);

let packedNodeCount = 0;
let packedParentCount = 0;
let packedThetaSquared = 0.5 * 0.5;
let packedEpsilonSquared = 1;

export function getPackedNodeCount(): number {
    return packedNodeCount;
}

export function getPackedParentCount(): number {
    return packedParentCount;
}

export function getPackedThetaSquared(): number {
    return packedThetaSquared;
}

export function buildPackedQuadTree(bodies: readonly Body[], theta = 0.5, epsilon = 1): boolean {
    packedThetaSquared = theta * theta;
    packedEpsilonSquared = epsilon * epsilon;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.mass === 0) continue;

        const x = body.position.x;
        const y = body.position.y;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    if (minX === Number.POSITIVE_INFINITY) {
        packedNodeCount = 0;
        packedParentCount = 0;
        return false;
    }

    clearPackedQuadTree((minX + maxX) * 0.5, (minY + maxY) * 0.5, Math.max(maxX - minX, maxY - minY));

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        insertPackedXYMass(body.position.x, body.position.y, body.mass);
    }

    propagatePackedQuadTree();
    return true;
}

export function clearPackedQuadTree(centerX: number, centerY: number, size: number): void {
    packedNodeCount = 0;
    packedParentCount = 0;
    pushPackedNode(0, centerX, centerY, size);
}

export function insertPackedBody(pos: Vec2, mass: number): void {
    insertPackedXYMass(pos.x, pos.y, mass);
}

export function insertPackedXYMass(x: number, y: number, mass: number): void {
    if (mass === 0) return;

    let node = PACKED_ROOT;

    while (packedChildren[node] !== 0) {
        const quadrant = ((y > packedCenterY[node] ? 1 : 0) << 1) | (x > packedCenterX[node] ? 1 : 0);
        node = packedChildren[node] + quadrant;
    }

    if (packedMass[node] === 0) {
        packedPosX[node] = x;
        packedPosY[node] = y;
        packedMass[node] = mass;
        return;
    }

    const existingX = packedPosX[node];
    const existingY = packedPosY[node];
    const existingMass = packedMass[node];

    if (x === existingX && y === existingY) {
        packedMass[node] += mass;
        return;
    }

    for (;;) {
        const children = subdividePackedNode(node);
        const q1 = ((existingY > packedCenterY[node] ? 1 : 0) << 1) | (existingX > packedCenterX[node] ? 1 : 0);
        const q2 = ((y > packedCenterY[node] ? 1 : 0) << 1) | (x > packedCenterX[node] ? 1 : 0);

        if (q1 === q2) {
            node = children + q1;
            continue;
        }

        const n1 = children + q1;
        packedPosX[n1] = existingX;
        packedPosY[n1] = existingY;
        packedMass[n1] = existingMass;

        const n2 = children + q2;
        packedPosX[n2] = x;
        packedPosY[n2] = y;
        packedMass[n2] = mass;
        return;
    }
}

export function propagatePackedQuadTree(): void {
    for (let p = packedParentCount - 1; p >= 0; p--) {
        const node = packedParents[p];
        const firstChild = packedChildren[node];

        const i0 = firstChild;
        const i1 = firstChild + 1;
        const i2 = firstChild + 2;
        const i3 = firstChild + 3;

        const m0 = packedMass[i0];
        const m1 = packedMass[i1];
        const m2 = packedMass[i2];
        const m3 = packedMass[i3];
        const totalMass = m0 + m1 + m2 + m3;

        packedMass[node] = totalMass;
        packedPosX[node] =
            (packedPosX[i0] * m0 + packedPosX[i1] * m1 + packedPosX[i2] * m2 + packedPosX[i3] * m3) / totalMass;
        packedPosY[node] =
            (packedPosY[i0] * m0 + packedPosY[i1] * m1 + packedPosY[i2] * m2 + packedPosY[i3] * m3) / totalMass;
    }
}

export function packedAccelerationAt(
    x: number,
    y: number,
    G: number,
    out = new Vec2(),
    thetaSquared = packedThetaSquared,
): Vec2 {
    out.x = 0;
    out.y = 0;

    if (packedNodeCount === 0) {
        return out;
    }

    let node = PACKED_ROOT;

    for (;;) {
        const dx = packedPosX[node] - x;
        const dy = packedPosY[node] - y;
        const distanceSquared = dx * dx + dy * dy;

        if (packedChildren[node] === 0 || packedSize[node] * packedSize[node] < distanceSquared * thetaSquared) {
            const denominator = (distanceSquared + packedEpsilonSquared) * Math.sqrt(distanceSquared);

            if (denominator !== 0) {
                const scale = Math.min((G * packedMass[node]) / denominator, Number.MAX_VALUE);
                out.x += dx * scale;
                out.y += dy * scale;
            }

            if (packedNext[node] === 0) {
                break;
            }

            node = packedNext[node];
        } else {
            node = packedChildren[node];
        }
    }

    return out;
}

export function packedForceOn(body: Body, G: number, out = new Vec2(), thetaSquared = packedThetaSquared): Vec2 {
    packedAccelerationAt(body.position.x, body.position.y, G, out, thetaSquared);
    out.x *= body.mass;
    out.y *= body.mass;
    return out;
}

function subdividePackedNode(node: number): number {
    if (packedParentCount >= PACKED_PARENT_CAPACITY) {
        throw new Error('PackedQuadTree parent capacity exceeded');
    }

    if (packedNodeCount + 4 > PACKED_NODE_CAPACITY) {
        throw new Error('PackedQuadTree node capacity exceeded');
    }

    packedParents[packedParentCount] = node;
    packedParentCount++;

    const children = packedNodeCount;
    packedChildren[node] = children;

    const childSize = packedSize[node] * 0.5;
    const offset = childSize * 0.5;
    const centerX = packedCenterX[node];
    const centerY = packedCenterY[node];

    pushPackedNode(children + 1, centerX - offset, centerY - offset, childSize);
    pushPackedNode(children + 2, centerX + offset, centerY - offset, childSize);
    pushPackedNode(children + 3, centerX - offset, centerY + offset, childSize);
    pushPackedNode(packedNext[node], centerX + offset, centerY + offset, childSize);

    return children;
}

function pushPackedNode(next: number, centerX: number, centerY: number, size: number): number {
    if (packedNodeCount >= PACKED_NODE_CAPACITY) {
        throw new Error('PackedQuadTree node capacity exceeded');
    }

    const node = packedNodeCount;
    packedNodeCount++;

    packedChildren[node] = 0;
    packedNext[node] = next;
    packedPosX[node] = 0;
    packedPosY[node] = 0;
    packedMass[node] = 0;
    packedCenterX[node] = centerX;
    packedCenterY[node] = centerY;
    packedSize[node] = size;

    return node;
}
