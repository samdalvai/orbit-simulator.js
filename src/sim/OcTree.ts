import { MAX_BODIES } from '../shared/Constants';
import * as Utils from '../shared/Utils';
import { forceSumX, forceSumY, forceSumZ, getBodyCount, mass, positionX, positionY, positionZ } from './Body';

export const ROOT = 0;
const CHILD_COUNT = 8;

// TODO: the PARENT_CAPACITY is arbitrary, can we define exactly how many nodes we need for the octree?
const PARENT_CAPACITY = MAX_BODIES * 4;
const NODE_CAPACITY = 1 + PARENT_CAPACITY * CHILD_COUNT;

export const children = Utils.createUint32Buffer(NODE_CAPACITY);
const next = new Uint32Array(NODE_CAPACITY);

export const nodePositionX = Utils.createFloat64Buffer(NODE_CAPACITY);
export const nodePositionY = Utils.createFloat64Buffer(NODE_CAPACITY);
export const nodePositionZ = Utils.createFloat64Buffer(NODE_CAPACITY);

export const nodeMass = Utils.createFloat64Buffer(NODE_CAPACITY);

const centerX = new Float64Array(NODE_CAPACITY);
const centerY = new Float64Array(NODE_CAPACITY);
const centerZ = new Float64Array(NODE_CAPACITY);

export const size = Utils.createFloat64Buffer(NODE_CAPACITY);
export const parents = Utils.createFloat64Buffer(NODE_CAPACITY);

export let nodeCount = 0;
let parentCount = 0;
let thetaSquared = 0.5 * 0.5;
let epsilonSquared = 1;

export function buildOctree(theta = 0.5, epsilon = 1): boolean {
    thetaSquared = theta * theta;
    epsilonSquared = epsilon * epsilon;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < getBodyCount(); i++) {
        if (mass[i] === 0) continue;

        const x = positionX[i];
        const y = positionY[i];
        const z = positionZ[i];

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
    }

    if (minX === Number.POSITIVE_INFINITY) {
        nodeCount = 0;
        parentCount = 0;
        return false;
    }

    clearOctree(
        (minX + maxX) * 0.5,
        (minY + maxY) * 0.5,
        (minZ + maxZ) * 0.5,
        Math.max(maxX - minX, maxY - minY, maxZ - minZ),
    );

    for (let i = 0; i < getBodyCount(); i++) {
        insertXYZMass(positionX[i], positionY[i], positionZ[i], mass[i]);
    }

    propagate();
    return true;
}

export function clearOctree(rootCenterX: number, rootCenterY: number, rootCenterZ: number, rootSize: number): void {
    nodeCount = 0;
    parentCount = 0;
    pushNode(0, rootCenterX, rootCenterY, rootCenterZ, rootSize);
}

export function insertXYZMass(x: number, y: number, z: number, bodyMass: number): void {
    if (bodyMass === 0) return;

    let node = ROOT;

    while (children[node] !== 0) {
        node = children[node] + getOctant(node, x, y, z);
    }

    if (nodeMass[node] === 0) {
        nodePositionX[node] = x;
        nodePositionY[node] = y;
        nodePositionZ[node] = z;
        nodeMass[node] = bodyMass;
        return;
    }

    const existingX = nodePositionX[node];
    const existingY = nodePositionY[node];
    const existingZ = nodePositionZ[node];
    const existingMass = nodeMass[node];

    if (x === existingX && y === existingY && z === existingZ) {
        nodeMass[node] += bodyMass;
        return;
    }

    for (;;) {
        const firstChild = subdivideNode(node);
        const q1 = getOctant(node, existingX, existingY, existingZ);
        const q2 = getOctant(node, x, y, z);

        if (q1 === q2) {
            node = firstChild + q1;
            continue;
        }

        const n1 = firstChild + q1;
        nodePositionX[n1] = existingX;
        nodePositionY[n1] = existingY;
        nodePositionZ[n1] = existingZ;
        nodeMass[n1] = existingMass;

        const n2 = firstChild + q2;
        nodePositionX[n2] = x;
        nodePositionY[n2] = y;
        nodePositionZ[n2] = z;
        nodeMass[n2] = bodyMass;
        return;
    }
}

export function propagate(): void {
    for (let p = parentCount - 1; p >= 0; p--) {
        const node = parents[p];
        const firstChild = children[node];

        let totalMass = 0;
        let weightedX = 0;
        let weightedY = 0;
        let weightedZ = 0;

        for (let i = 0; i < CHILD_COUNT; i++) {
            const child = firstChild + i;
            const childMass = nodeMass[child];

            totalMass += childMass;
            weightedX += nodePositionX[child] * childMass;
            weightedY += nodePositionY[child] * childMass;
            weightedZ += nodePositionZ[child] * childMass;
        }

        nodeMass[node] = totalMass;
        nodePositionX[node] = weightedX / totalMass;
        nodePositionY[node] = weightedY / totalMass;
        nodePositionZ[node] = weightedZ / totalMass;
    }
}

export function applyForceOn(
    bodyIndex: number,
    x: number,
    y: number,
    z: number,
    G: number,
    thetaSq = thetaSquared,
): void {
    let accX = 0;
    let accY = 0;
    let accZ = 0;

    if (nodeCount === 0) {
        return;
    }

    let node = ROOT;

    for (;;) {
        const dx = nodePositionX[node] - x;
        const dy = nodePositionY[node] - y;
        const dz = nodePositionZ[node] - z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;

        if (children[node] === 0 || size[node] * size[node] < distanceSquared * thetaSq) {
            const denominator = (distanceSquared + epsilonSquared) * Math.sqrt(distanceSquared);

            if (denominator !== 0) {
                const scale = Math.min((G * nodeMass[node]) / denominator, Number.MAX_VALUE);
                accX += dx * scale;
                accY += dy * scale;
                accZ += dz * scale;
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
    forceSumZ[bodyIndex] += accZ * bodyMass;
}

function subdivideNode(node: number): number {
    if (parentCount >= PARENT_CAPACITY) {
        throw new Error('Octree parent capacity exceeded');
    }

    if (nodeCount + CHILD_COUNT > NODE_CAPACITY) {
        throw new Error('Octree node capacity exceeded');
    }

    parents[parentCount] = node;
    parentCount++;

    const firstChild = nodeCount;
    children[node] = firstChild;

    const childSize = size[node] * 0.5;
    const offset = childSize * 0.5;
    const nodeCenterX = centerX[node];
    const nodeCenterY = centerY[node];
    const nodeCenterZ = centerZ[node];
    const left = nodeCenterX - offset;
    const right = nodeCenterX + offset;
    const bottom = nodeCenterY - offset;
    const top = nodeCenterY + offset;
    const back = nodeCenterZ - offset;
    const front = nodeCenterZ + offset;

    pushNode(firstChild + 1, left, bottom, back, childSize);
    pushNode(firstChild + 2, right, bottom, back, childSize);
    pushNode(firstChild + 3, left, top, back, childSize);
    pushNode(firstChild + 4, right, top, back, childSize);
    pushNode(firstChild + 5, left, bottom, front, childSize);
    pushNode(firstChild + 6, right, bottom, front, childSize);
    pushNode(firstChild + 7, left, top, front, childSize);
    pushNode(next[node], right, top, front, childSize);

    return firstChild;
}

function getOctant(node: number, x: number, y: number, z: number): number {
    return ((z > centerZ[node] ? 1 : 0) << 2) | ((y > centerY[node] ? 1 : 0) << 1) | (x > centerX[node] ? 1 : 0);
}

function pushNode(
    nextNode: number,
    nodeCenterX: number,
    nodeCenterY: number,
    nodeCenterZ: number,
    nodeSize: number,
): number {
    Utils.assert(nodeCount < NODE_CAPACITY, 'Octree node capacity exceeded');

    const node = nodeCount++;

    children[node] = 0;
    next[node] = nextNode;
    nodePositionX[node] = 0;
    nodePositionY[node] = 0;
    nodePositionZ[node] = 0;
    nodeMass[node] = 0;
    centerX[node] = nodeCenterX;
    centerY[node] = nodeCenterY;
    centerZ[node] = nodeCenterZ;
    size[node] = nodeSize;

    return node;
}
