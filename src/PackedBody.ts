import { MAX_BODIES } from './Constants';
import * as Utils from './Utils';
import { Vec2 } from './Vec2';

export enum BodyType {
    STAR,
    PLANET,
    MOON,
    ASTEROID,
}

const CAPACITY = MAX_BODIES;
export const NO_PARENT = -1;

export const ids = new Int32Array(CAPACITY);
export const indexOfId = new Int32Array(CAPACITY);

export const parents = new Int32Array(CAPACITY);
export const bodyTypes = new Uint8Array(CAPACITY);

export const radiuses = new Float64Array(CAPACITY);

// Linear motion
export const posX = new Float64Array(CAPACITY);
export const posY = new Float64Array(CAPACITY);
export const velX = new Float64Array(CAPACITY);
export const velY = new Float64Array(CAPACITY);
export const accX = new Float64Array(CAPACITY);
export const accY = new Float64Array(CAPACITY);

// Forces
export const sumForcesX = new Float64Array(CAPACITY);
export const sumForcesY = new Float64Array(CAPACITY);

// Mass
export const masses = new Float64Array(CAPACITY);
export const invMasses = new Float64Array(CAPACITY);

// AABB for collision
export const minX = new Float64Array(CAPACITY);
export const maxX = new Float64Array(CAPACITY);
export const minY = new Float64Array(CAPACITY);
export const maxY = new Float64Array(CAPACITY);

let bodyCount = 0;

export function getBodyCount(): number {
    return bodyCount;
}

export function clearBodies(): void {
    bodyCount = 0;
}

export function addNewBody(
    x: number,
    y: number,
    radius: number,
    mass: number,
    bodyType: BodyType,
    velocity: Vec2,
    parentId: number = NO_PARENT,
): number {
    Utils.assert(mass > 0, 'Mass needs to be greater than 0');
    Utils.assert(bodyCount < CAPACITY, 'Body capacity exceeded');

    ids[bodyCount] = bodyCount;
    indexOfId[bodyCount] = bodyCount;

    parents[bodyCount] = parentId;
    bodyTypes[bodyCount] = bodyType;
    radiuses[bodyCount] = radius;

    posX[bodyCount] = x;
    posY[bodyCount] = y;
    velX[bodyCount] = velocity.x;
    velY[bodyCount] = velocity.y;
    accX[bodyCount] = 0;
    accY[bodyCount] = 0;

    sumForcesX[bodyCount] = 0;
    sumForcesY[bodyCount] = 0;

    masses[bodyCount] = mass;
    invMasses[bodyCount] = 1 / mass;

    minX[bodyCount] = 0;
    minY[bodyCount] = 0;
    maxX[bodyCount] = 0;
    maxY[bodyCount] = 0;

    updateAABB(bodyCount);

    // Body index === id
    return bodyCount++;
}

// TODO: body index or body id?
export function removeBody(id: number): void {
    Utils.assert(id >= 0 && id < bodyCount, 'Body id out of bounds');

    const lastIndex = bodyCount - 1;

    ids[id] = ids[lastIndex];
    //indexOfId[id] = indexOfId[lastIndex];

    parents[id] = parents[lastIndex];
    bodyTypes[id] = bodyTypes[lastIndex];
    radiuses[id] = radiuses[lastIndex];

    posX[id] = posX[lastIndex];
    posY[id] = posY[lastIndex];
    velX[id] = velX[lastIndex];
    velY[id] = velY[lastIndex];
    accX[id] = accX[lastIndex];
    accY[id] = accY[lastIndex];

    sumForcesX[id] = sumForcesX[lastIndex];
    sumForcesY[id] = sumForcesY[lastIndex];

    masses[id] = masses[lastIndex];
    invMasses[id] = invMasses[lastIndex];

    minX[id] = minX[lastIndex];
    minY[id] = minY[lastIndex];
    maxX[id] = maxX[lastIndex];
    maxY[id] = maxY[lastIndex];

    bodyCount--;
    // TODO: need to check if deleted body was parent to another one and remove that parent entry
    // TODO: need to check if moved body was parent to antoher one and update that parent entry
}

export function swapBodies(aIndex: number, bIndex: number): void {
    Utils.assert(aIndex >= 0 && aIndex < bodyCount, 'Body id out of bounds');
    Utils.assert(bIndex >= 0 && bIndex < bodyCount, 'Body id out of bounds');
    const idA = ids[aIndex];
    const idB = ids[bIndex];

    swapInt32(ids, aIndex, bIndex);

    indexOfId[idA] = bIndex;
    indexOfId[idB] = aIndex;

    swapInt32(parents, aIndex, bIndex);
    swapUint8(bodyTypes, aIndex, bIndex);
    swapFloat64(radiuses, aIndex, bIndex);

    swapFloat64(posX, aIndex, bIndex);
    swapFloat64(posY, aIndex, bIndex);
    swapFloat64(velX, aIndex, bIndex);
    swapFloat64(velY, aIndex, bIndex);
    swapFloat64(accX, aIndex, bIndex);
    swapFloat64(accY, aIndex, bIndex);

    swapFloat64(sumForcesX, aIndex, bIndex);
    swapFloat64(sumForcesY, aIndex, bIndex);

    swapFloat64(masses, aIndex, bIndex);
    swapFloat64(invMasses, aIndex, bIndex);

    swapFloat64(minX, aIndex, bIndex);
    swapFloat64(minY, aIndex, bIndex);
    swapFloat64(maxX, aIndex, bIndex);
    swapFloat64(maxY, aIndex, bIndex);
}

export function addForce(bodyIndex: number, force: Vec2) {
    sumForcesX[bodyIndex] += force.x;
    sumForcesY[bodyIndex] += force.y;
}

export function addForceXY(bodyIndex: number, x: number, y: number) {
    sumForcesX[bodyIndex] += x;
    sumForcesY[bodyIndex] += y;
}

export function clearForces(bodyIndex: number) {
    sumForcesX[bodyIndex] = 0;
    sumForcesY[bodyIndex] = 0;
}

export function applyImpulseLinear(bodyIndex: number, j: Vec2): void {
    const invM = invMasses[bodyIndex];
    velX[bodyIndex] += j.x * invM;
    velY[bodyIndex] += j.y * invM;
}

export function initializeAcceleration(bodyIndex: number): void {
    // Find the acceleration based on the forces that are being applied and the mass
    const invM = invMasses[bodyIndex];
    accX[bodyIndex] = sumForcesX[bodyIndex] * invM;
    accY[bodyIndex] = sumForcesY[bodyIndex] * invM;

    // Clear all the forces and torque acting on the object before the next physics step
    clearForces(bodyIndex);
}

export function integrateVerletPosition(bodyIndex: number, dt: number): void {
    const ax = accX[bodyIndex];
    const ay = accY[bodyIndex];

    posX[bodyIndex] += velX[bodyIndex] * dt + 0.5 * ax * dt * dt;
    posY[bodyIndex] += velY[bodyIndex] * dt + 0.5 * ay * dt * dt;

    // Update AABB values based on new position
    updateAABB(bodyIndex);
}

export function integrateVerletVelocity(bodyIndex: number, dt: number): void {
    const oldAx = accX[bodyIndex];
    const oldAy = accY[bodyIndex];

    const invM = invMasses[bodyIndex];
    const newAx = sumForcesX[bodyIndex] * invM;
    const newAy = sumForcesY[bodyIndex] * invM;

    velX[bodyIndex] += 0.5 * (oldAx + newAx) * dt;
    velY[bodyIndex] += 0.5 * (oldAy + newAy) * dt;

    // store for next step
    accX[bodyIndex] = newAx;
    accY[bodyIndex] = newAy;

    clearForces(bodyIndex);
}

export function updateAABB(bodyIndex: number) {
    const radius = radiuses[bodyIndex];
    minX[bodyIndex] = posX[bodyIndex] - radius;
    maxX[bodyIndex] = posX[bodyIndex] + radius;
    minY[bodyIndex] = posY[bodyIndex] - radius;
    maxY[bodyIndex] = posY[bodyIndex] + radius;
}

function swapFloat64(array: Float64Array, aIndex: number, bIndex: number): void {
    const tmp = array[aIndex];
    array[aIndex] = array[bIndex];
    array[bIndex] = tmp;
}

function swapInt32(array: Int32Array, aIndex: number, bIndex: number): void {
    const tmp = array[aIndex];
    array[aIndex] = array[bIndex];
    array[bIndex] = tmp;
}

function swapUint8(array: Uint8Array, aIndex: number, bIndex: number): void {
    const tmp = array[aIndex];
    array[aIndex] = array[bIndex];
    array[bIndex] = tmp;
}
