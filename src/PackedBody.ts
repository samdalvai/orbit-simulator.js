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

export function swapBodies(a: number, b: number): void {
    Utils.assert(a >= 0 && a < bodyCount, 'Body id out of bounds');
    Utils.assert(b >= 0 && b < bodyCount, 'Body id out of bounds');
    const idA = ids[a];
    const idB = ids[b];

    swapInt32(ids, a, b);

    indexOfId[idA] = b;
    indexOfId[idB] = a;

    swapInt32(parents, a, b);
    swapUint8(bodyTypes, a, b);
    swapFloat64(radiuses, a, b);

    swapFloat64(posX, a, b);
    swapFloat64(posY, a, b);
    swapFloat64(velX, a, b);
    swapFloat64(velY, a, b);
    swapFloat64(accX, a, b);
    swapFloat64(accY, a, b);

    swapFloat64(sumForcesX, a, b);
    swapFloat64(sumForcesY, a, b);

    swapFloat64(masses, a, b);
    swapFloat64(invMasses, a, b);

    swapFloat64(minX, a, b);
    swapFloat64(minY, a, b);
    swapFloat64(maxX, a, b);
    swapFloat64(maxY, a, b);
}

export function addForce(id: number, force: Vec2) {
    sumForcesX[id] += force.x;
    sumForcesY[id] += force.y;
}

export function addForceXY(id: number, x: number, y: number) {
    sumForcesX[id] += x;
    sumForcesY[id] += y;
}

export function clearForces(id: number) {
    sumForcesX[id] = 0;
    sumForcesY[id] = 0;
}

export function applyImpulseLinear(id: number, j: Vec2): void {
    const invM = invMasses[id];
    velX[id] += j.x * invM;
    velY[id] += j.y * invM;
}

export function initializeAcceleration(id: number): void {
    // Find the acceleration based on the forces that are being applied and the mass
    const invM = invMasses[id];
    accX[id] = sumForcesX[id] * invM;
    accY[id] = sumForcesY[id] * invM;

    // Clear all the forces and torque acting on the object before the next physics step
    clearForces(id);
}

export function integrateVerletPosition(id: number, dt: number): void {
    const ax = accX[id];
    const ay = accY[id];

    posX[id] += velX[id] * dt + 0.5 * ax * dt * dt;
    posY[id] += velY[id] * dt + 0.5 * ay * dt * dt;

    // Update AABB values based on new position
    updateAABB(id);
}

export function integrateVerletVelocity(id: number, dt: number): void {
    const oldAx = accX[id];
    const oldAy = accY[id];

    const invM = invMasses[id];
    const newAx = sumForcesX[id] * invM;
    const newAy = sumForcesY[id] * invM;

    velX[id] += 0.5 * (oldAx + newAx) * dt;
    velY[id] += 0.5 * (oldAy + newAy) * dt;

    // store for next step
    accX[id] = newAx;
    accY[id] = newAy;

    clearForces(id);
}

export function updateAABB(id: number) {
    const radius = radiuses[id];
    minX[id] = posX[id] - radius;
    maxX[id] = posX[id] + radius;
    minY[id] = posY[id] - radius;
    maxY[id] = posY[id] + radius;
}

function swapFloat64(array: Float64Array, a: number, b: number): void {
    const tmp = array[a];
    array[a] = array[b];
    array[b] = tmp;
}

function swapInt32(array: Int32Array, a: number, b: number): void {
    const tmp = array[a];
    array[a] = array[b];
    array[b] = tmp;
}

function swapUint8(array: Uint8Array, a: number, b: number): void {
    const tmp = array[a];
    array[a] = array[b];
    array[b] = tmp;
}
