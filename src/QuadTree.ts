import { MAX_BODIES } from './Constants';
import { forceSumX, forceSumY, getBodyCount, mass, positionX, positionY } from './Body';
import * as Utils from './Utils';
import { Vec2 } from './Vec2';

const ROOT = 0;

// TODO: the PARENT_CAPACITY is arbitrary, can we define exactly how many nodes we need for the quad tree?
const PARENT_CAPACITY = MAX_BODIES * 4;
const NODE_CAPACITY = PARENT_CAPACITY * 4;

const children = new Uint32Array(NODE_CAPACITY);
const next = new Uint32Array(NODE_CAPACITY);
const nodepositionX = new Float64Array(NODE_CAPACITY);
const nodepositionY = new Float64Array(NODE_CAPACITY);
const nodeMass = new Float64Array(NODE_CAPACITY);
const centerX = new Float64Array(NODE_CAPACITY);
const centerY = new Float64Array(NODE_CAPACITY);
const size = new Float64Array(NODE_CAPACITY);
const parents = new Uint32Array(PARENT_CAPACITY);

let nodeCount = 0;
let parentCount = 0;
let thetaSquared = 0.5 * 0.5;
let epsilonSquared = 1;

export function getNodeCount(): number {
    return nodeCount;
}

export function getParentCount(): number {
    return parentCount;
}

export function getThetaSquared(): number {
    return thetaSquared;
}

export function buildPackedQuadTree(theta = 0.5, epsilon = 1): boolean {
    thetaSquared = theta * theta;
    epsilonSquared = epsilon * epsilon;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < getBodyCount(); i++) {
        if (mass[i] === 0) continue;

        const x = positionX[i];
        const y = positionY[i];

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

    for (let i = 0; i < getBodyCount(); i++) {
        insertXYMass(positionX[i], positionY[i], mass[i]);
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

    if (nodeMass[node] === 0) {
        nodepositionX[node] = x;
        nodepositionY[node] = y;
        nodeMass[node] = bodyMass;
        return;
    }

    const existingX = nodepositionX[node];
    const existingY = nodepositionY[node];
    const existingMass = nodeMass[node];

    if (x === existingX && y === existingY) {
        nodeMass[node] += bodyMass;
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
        nodepositionX[n1] = existingX;
        nodepositionY[n1] = existingY;
        nodeMass[n1] = existingMass;

        const n2 = firstChild + q2;
        nodepositionX[n2] = x;
        nodepositionY[n2] = y;
        nodeMass[n2] = bodyMass;
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

        const m0 = nodeMass[i0];
        const m1 = nodeMass[i1];
        const m2 = nodeMass[i2];
        const m3 = nodeMass[i3];
        const totalMass = m0 + m1 + m2 + m3;

        nodeMass[node] = totalMass;
        nodepositionX[node] =
            (nodepositionX[i0] * m0 + nodepositionX[i1] * m1 + nodepositionX[i2] * m2 + nodepositionX[i3] * m3) /
            totalMass;
        nodepositionY[node] =
            (nodepositionY[i0] * m0 + nodepositionY[i1] * m1 + nodepositionY[i2] * m2 + nodepositionY[i3] * m3) /
            totalMass;
    }
}

export function applyForceOn(bodyIndex: number, x: number, y: number, G: number, thetaSq = thetaSquared): void {
    let accX = 0;
    let accY = 0;

    if (nodeCount === 0) {
        return;
    }

    let node = ROOT;

    for (;;) {
        const dx = nodepositionX[node] - x;
        const dy = nodepositionY[node] - y;
        const distanceSquared = dx * dx + dy * dy;

        if (children[node] === 0 || size[node] * size[node] < distanceSquared * thetaSq) {
            const denominator = (distanceSquared + epsilonSquared) * Math.sqrt(distanceSquared);

            if (denominator !== 0) {
                const scale = Math.min((G * nodeMass[node]) / denominator, Number.MAX_VALUE);
                accX += dx * scale;
                accY += dy * scale;
            }

            if (next[node] === 0) {
                break;
            }

            node = next[node];
        } else {
            node = children[node];
        }
    }

    const bodyMass = mass[bodyIndex];
    forceSumX[bodyIndex] += accX * bodyMass;
    forceSumY[bodyIndex] += accY * bodyMass;
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
    Utils.assert(nodeCount < NODE_CAPACITY, 'QuadTree node capacity exceeded');

    const node = nodeCount++;

    children[node] = 0;
    next[node] = nextNode;
    nodepositionX[node] = 0;
    nodepositionY[node] = 0;
    nodeMass[node] = 0;
    centerX[node] = nodeCenterX;
    centerY[node] = nodeCenterY;
    size[node] = nodeSize;

    return node;
}
