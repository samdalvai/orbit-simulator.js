import { Body } from './Body';
import { MAX_BODIES } from './Constants';
import { Vec2 } from './Vec2';

export const ROOT = 0;
export const NODE_CAPACITY = MAX_BODIES * 32;
export const PARENT_CAPACITY = NODE_CAPACITY / 4;

export const children = new Uint32Array(NODE_CAPACITY);
export const next = new Uint32Array(NODE_CAPACITY);
export const posX = new Float64Array(NODE_CAPACITY);
export const posY = new Float64Array(NODE_CAPACITY);
export const mass = new Float64Array(NODE_CAPACITY);
export const centerX = new Float64Array(NODE_CAPACITY);
export const centerY = new Float64Array(NODE_CAPACITY);
export const size = new Float64Array(NODE_CAPACITY);
export const parents = new Uint32Array(PARENT_CAPACITY);

let nodeCount = 0;
let parentCount = 0;
let thetaSquared = 0.5 * 0.5;
let epsilonSquared = 1;

export function buildQuadTree(bodies: readonly Body[], theta = 0.5, epsilon = 1): boolean {
    thetaSquared = theta * theta;
    epsilonSquared = epsilon * epsilon;

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
        nodeCount = 0;
        parentCount = 0;
        return false;
    }

    clearQuadTree((minX + maxX) * 0.5, (minY + maxY) * 0.5, Math.max(maxX - minX, maxY - minY));

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        insertXYMass(body.position.x, body.position.y, body.mass);
    }

    propagate();
    return true;
}

export function clearQuadTree(rootCenterX: number, rootCenterY: number, rootSize: number): void {
    nodeCount = 0;
    parentCount = 0;
    pushNode(0, rootCenterX, rootCenterY, rootSize);
}

export function insertBody(pos: Vec2, bodyMass: number): void {
    insertXYMass(pos.x, pos.y, bodyMass);
}

export function insertXYMass(x: number, y: number, bodyMass: number): void {
    if (bodyMass === 0) return;

    let node = ROOT;

    while (children[node] !== 0) {
        const quadrant = ((y > centerY[node] ? 1 : 0) << 1) | (x > centerX[node] ? 1 : 0);
        node = children[node] + quadrant;
    }

    if (mass[node] === 0) {
        posX[node] = x;
        posY[node] = y;
        mass[node] = bodyMass;
        return;
    }

    const existingX = posX[node];
    const existingY = posY[node];
    const existingMass = mass[node];

    if (x === existingX && y === existingY) {
        mass[node] += bodyMass;
        return;
    }

    for (;;) {
        const firstChild = subdivideNode(node);
        const q1 = ((existingY > centerY[node] ? 1 : 0) << 1) | (existingX > centerX[node] ? 1 : 0);
        const q2 = ((y > centerY[node] ? 1 : 0) << 1) | (x > centerX[node] ? 1 : 0);

        if (q1 === q2) {
            node = firstChild + q1;
            continue;
        }

        const n1 = firstChild + q1;
        posX[n1] = existingX;
        posY[n1] = existingY;
        mass[n1] = existingMass;

        const n2 = firstChild + q2;
        posX[n2] = x;
        posY[n2] = y;
        mass[n2] = bodyMass;
        return;
    }
}

export function propagate(): void {
    for (let p = parentCount - 1; p >= 0; p--) {
        const node = parents[p];
        const firstChild = children[node];

        const i0 = firstChild;
        const i1 = firstChild + 1;
        const i2 = firstChild + 2;
        const i3 = firstChild + 3;

        const m0 = mass[i0];
        const m1 = mass[i1];
        const m2 = mass[i2];
        const m3 = mass[i3];
        const totalMass = m0 + m1 + m2 + m3;

        mass[node] = totalMass;
        posX[node] = (posX[i0] * m0 + posX[i1] * m1 + posX[i2] * m2 + posX[i3] * m3) / totalMass;
        posY[node] = (posY[i0] * m0 + posY[i1] * m1 + posY[i2] * m2 + posY[i3] * m3) / totalMass;
    }
}

export function accelerationAt(x: number, y: number, G: number, out = new Vec2(), thetaSq = thetaSquared): Vec2 {
    out.x = 0;
    out.y = 0;

    if (nodeCount === 0) {
        return out;
    }

    let node = ROOT;

    for (;;) {
        const dx = posX[node] - x;
        const dy = posY[node] - y;
        const distanceSquared = dx * dx + dy * dy;

        if (children[node] === 0 || size[node] * size[node] < distanceSquared * thetaSq) {
            const denominator = (distanceSquared + epsilonSquared) * Math.sqrt(distanceSquared);

            if (denominator !== 0) {
                const scale = Math.min((G * mass[node]) / denominator, Number.MAX_VALUE);
                out.x += dx * scale;
                out.y += dy * scale;
            }

            if (next[node] === 0) {
                break;
            }

            node = next[node];
        } else {
            node = children[node];
        }
    }

    return out;
}

export function forceOn(body: Body, G: number, out = new Vec2(), thetaSq = thetaSquared): Vec2 {
    accelerationAt(body.position.x, body.position.y, G, out, thetaSq);
    out.x *= body.mass;
    out.y *= body.mass;
    return out;
}

function subdivideNode(node: number): number {
    if (parentCount >= PARENT_CAPACITY) {
        throw new Error('QuadTree parent capacity exceeded');
    }

    if (nodeCount + 4 > NODE_CAPACITY) {
        throw new Error('QuadTree node capacity exceeded');
    }

    parents[parentCount] = node;
    parentCount++;

    const firstChild = nodeCount;
    children[node] = firstChild;

    const childSize = size[node] * 0.5;
    const offset = childSize * 0.5;
    const nodeCenterX = centerX[node];
    const nodeCenterY = centerY[node];

    pushNode(firstChild + 1, nodeCenterX - offset, nodeCenterY - offset, childSize);
    pushNode(firstChild + 2, nodeCenterX + offset, nodeCenterY - offset, childSize);
    pushNode(firstChild + 3, nodeCenterX - offset, nodeCenterY + offset, childSize);
    pushNode(next[node], nodeCenterX + offset, nodeCenterY + offset, childSize);

    return firstChild;
}

function pushNode(nextNode: number, nodeCenterX: number, nodeCenterY: number, nodeSize: number): number {
    if (nodeCount >= NODE_CAPACITY) {
        throw new Error('QuadTree node capacity exceeded');
    }

    const node = nodeCount;
    nodeCount++;

    children[node] = 0;
    next[node] = nextNode;
    posX[node] = 0;
    posY[node] = 0;
    mass[node] = 0;
    centerX[node] = nodeCenterX;
    centerY[node] = nodeCenterY;
    size[node] = nodeSize;

    return node;
}
