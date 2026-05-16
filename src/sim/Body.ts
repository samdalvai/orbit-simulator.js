import { MAX_BODIES } from '../shared/Constants';
import * as Utils from '../shared/Utils';
import { Vec3 } from '../shared/Vec3';

export enum BodyType {
    STAR,
    PLANET,
    MOON,
    ASTEROID,
    BLACK_HOLE,
}

export type BodyId = number;

const CAPACITY = MAX_BODIES;
export const NO_PARENT = -1;

export const bodyIds = new Int32Array(CAPACITY);
export const bodyIndexById = new Int32Array(CAPACITY);

export const parentBodyIds = new Int32Array(CAPACITY);
export const bodyTypes = new Uint8Array(CAPACITY);

export const radii = new Float64Array(CAPACITY);

// Linear motion
export const positionX = new Float64Array(CAPACITY);
export const positionY = new Float64Array(CAPACITY);
export const positionZ = new Float64Array(CAPACITY);

export const velocityX = new Float64Array(CAPACITY);
export const velocityY = new Float64Array(CAPACITY);
export const velocityZ = new Float64Array(CAPACITY);

export const accelerationX = new Float64Array(CAPACITY);
export const accelerationY = new Float64Array(CAPACITY);
export const accelerationZ = new Float64Array(CAPACITY);

// Forces
export const forceSumX = new Float64Array(CAPACITY);
export const forceSumY = new Float64Array(CAPACITY);
export const forceSumZ = new Float64Array(CAPACITY);

// Mass
export const mass = new Float64Array(CAPACITY);
export const invMass = new Float64Array(CAPACITY);

// AABB for collision
export const aabbMinX = new Float64Array(CAPACITY);
export const aabbMaxX = new Float64Array(CAPACITY);

export const aabbMinY = new Float64Array(CAPACITY);
export const aabbMaxY = new Float64Array(CAPACITY);

export const aabbMinZ = new Float64Array(CAPACITY);
export const aabbMaxZ = new Float64Array(CAPACITY);

let bodyCount = 0;
let nextBodyId = 0;

export function getBodyCount(): number {
    return bodyCount;
}

export function clearBodies(): void {
    bodyCount = 0;
    nextBodyId = 0;
}

export function addNewBody(
    x: number,
    y: number,
    radius: number,
    bodyMass: number,
    bodyType: BodyType,
    velocity: Vec3 = new Vec3(),
    parentId: number = NO_PARENT,
): BodyId {
    Utils.assert(bodyMass > 0, 'Mass needs to be greater than 0');
    Utils.assert(bodyCount < CAPACITY, 'Body capacity exceeded');

    // Stale ids bug summary:
    // `bodyCount` was used both as the number of live bodies and as the next body ID.
    // After `removeBody`, `bodyCount` decreases, so a later `addNewBody` could reuse
    // an ID that still belonged to another live body. That made `bodyIndexById`,
    // render styles, selected bodies, deleted bodies, and parent links potentially
    // point to the wrong body.
    //
    // Fix:
    // Keep live-array indexing separate from identity:
    // - `bodyCount` tracks how many bodies are currently alive in the dense arrays.
    // - `nextBodyId` only generates unique IDs and never decreases during a simulation.
    // - removed IDs should be invalidated, so stale references cannot alias another body. ***
    // *** this still needs to be explored
    const index = bodyCount++;
    const bodyId = nextBodyId++;

    bodyIds[index] = bodyId;
    bodyIndexById[bodyId] = index;

    parentBodyIds[index] = parentId;
    bodyTypes[index] = bodyType;
    radii[index] = radius;

    positionX[index] = x;
    positionY[index] = y;
    positionZ[index] = 0; // TODO: pass real z

    velocityX[index] = velocity.x;
    velocityY[index] = velocity.y;
    velocityZ[index] = velocity.z;

    accelerationX[index] = 0;
    accelerationY[index] = 0;
    accelerationZ[index] = 0;

    forceSumX[index] = 0;
    forceSumY[index] = 0;
    forceSumZ[index] = 0;

    mass[index] = bodyMass;
    invMass[index] = 1 / bodyMass;

    aabbMinX[index] = 0;
    aabbMaxX[index] = 0;

    aabbMinY[index] = 0;
    aabbMaxY[index] = 0;

    aabbMaxZ[index] = 0;
    aabbMaxZ[index] = 0;

    updateAABB(index);

    // Insert the body at the correct position based on minX
    // this ensures that bodies are already almost sorted when teh simulation begins
    let currentIndex = index;
    while (currentIndex > 0 && aabbMinX[currentIndex - 1] > aabbMinX[currentIndex]) {
        swapBodies(currentIndex - 1, currentIndex);
        currentIndex--;
    }

    return bodyId;
}

export function removeBody(bodyId: number): void {
    const index = bodyIndexById[bodyId];
    Utils.assert(index >= 0 && index < bodyCount, 'Body id out of bounds');

    const lastIndex = bodyCount - 1;
    const movedId = bodyIds[lastIndex];

    bodyIds[index] = movedId;
    bodyIndexById[movedId] = index;

    parentBodyIds[index] = parentBodyIds[lastIndex];
    bodyTypes[index] = bodyTypes[lastIndex];
    radii[index] = radii[lastIndex];

    positionX[index] = positionX[lastIndex];
    positionY[index] = positionY[lastIndex];
    positionZ[index] = positionZ[lastIndex];

    velocityX[index] = velocityX[lastIndex];
    velocityY[index] = velocityY[lastIndex];
    velocityZ[index] = velocityZ[lastIndex];

    accelerationX[index] = accelerationX[lastIndex];
    accelerationY[index] = accelerationY[lastIndex];
    accelerationZ[index] = accelerationZ[lastIndex];

    forceSumX[index] = forceSumX[lastIndex];
    forceSumY[index] = forceSumY[lastIndex];
    forceSumZ[index] = forceSumZ[lastIndex];

    mass[index] = mass[lastIndex];
    invMass[index] = invMass[lastIndex];

    aabbMinX[index] = aabbMinX[lastIndex];
    aabbMaxX[index] = aabbMaxX[lastIndex];

    aabbMinY[index] = aabbMinY[lastIndex];
    aabbMaxY[index] = aabbMaxY[lastIndex];

    aabbMaxZ[index] = aabbMaxZ[lastIndex];
    aabbMaxY[index] = aabbMaxY[lastIndex];

    bodyCount--;

    for (let i = 0; i < bodyCount; i++) {
        if (parentBodyIds[i] === bodyId) {
            parentBodyIds[i] = NO_PARENT;
        }
    }
}

export function swapBodies(aIndex: number, bIndex: number): void {
    Utils.assert(aIndex >= 0 && aIndex < bodyCount, 'Body index out of bounds');
    Utils.assert(bIndex >= 0 && bIndex < bodyCount, 'Body index out of bounds');
    const idA = bodyIds[aIndex];
    const idB = bodyIds[bIndex];

    swapInt32(bodyIds, aIndex, bIndex);

    bodyIndexById[idA] = bIndex;
    bodyIndexById[idB] = aIndex;

    swapInt32(parentBodyIds, aIndex, bIndex);
    swapUint8(bodyTypes, aIndex, bIndex);
    swapFloat64(radii, aIndex, bIndex);

    swapFloat64(positionX, aIndex, bIndex);
    swapFloat64(positionY, aIndex, bIndex);
    swapFloat64(positionZ, aIndex, bIndex);

    swapFloat64(velocityX, aIndex, bIndex);
    swapFloat64(velocityY, aIndex, bIndex);
    swapFloat64(velocityZ, aIndex, bIndex);

    swapFloat64(accelerationX, aIndex, bIndex);
    swapFloat64(accelerationY, aIndex, bIndex);
    swapFloat64(accelerationZ, aIndex, bIndex);

    swapFloat64(forceSumX, aIndex, bIndex);
    swapFloat64(forceSumY, aIndex, bIndex);
    swapFloat64(forceSumZ, aIndex, bIndex);

    swapFloat64(mass, aIndex, bIndex);
    swapFloat64(invMass, aIndex, bIndex);

    swapFloat64(aabbMinX, aIndex, bIndex);
    swapFloat64(aabbMaxX, aIndex, bIndex);

    swapFloat64(aabbMinY, aIndex, bIndex);
    swapFloat64(aabbMaxY, aIndex, bIndex);

    swapFloat64(aabbMinZ, aIndex, bIndex);
    swapFloat64(aabbMaxZ, aIndex, bIndex);
}

export function addForce(bodyIndex: number, force: Vec3) {
    forceSumX[bodyIndex] += force.x;
    forceSumY[bodyIndex] += force.y;
    forceSumZ[bodyIndex] += force.y;
}

export function addForceXY(bodyIndex: number, x: number, y: number) {
    forceSumX[bodyIndex] += x;
    forceSumY[bodyIndex] += y;
    forceSumZ[bodyIndex] += y;
}

export function clearForces(bodyIndex: number) {
    forceSumX[bodyIndex] = 0;
    forceSumY[bodyIndex] = 0;
    forceSumZ[bodyIndex] = 0;
}

export function applyImpulseLinear(bodyIndex: number, j: Vec3): void {
    const invM = invMass[bodyIndex];
    velocityX[bodyIndex] += j.x * invM;
    velocityY[bodyIndex] += j.y * invM;
    velocityZ[bodyIndex] += j.y * invM;
}

export function initializeAcceleration(bodyIndex: number): void {
    // Find the acceleration based on the forces that are being applied and the mass
    const invM = invMass[bodyIndex];
    accelerationX[bodyIndex] = forceSumX[bodyIndex] * invM;
    accelerationY[bodyIndex] = forceSumY[bodyIndex] * invM;
    accelerationZ[bodyIndex] = forceSumY[bodyIndex] * invM;

    // Clear all the forces and torque acting on the object before the next physics step
    clearForces(bodyIndex);
}

export function integrateVerletPosition(bodyIndex: number, dt: number): void {
    const ax = accelerationX[bodyIndex];
    const ay = accelerationY[bodyIndex];
    const az = accelerationZ[bodyIndex];

    positionX[bodyIndex] += velocityX[bodyIndex] * dt + 0.5 * ax * dt * dt;
    positionY[bodyIndex] += velocityY[bodyIndex] * dt + 0.5 * ay * dt * dt;
    positionZ[bodyIndex] += velocityZ[bodyIndex] * dt + 0.5 * az * dt * dt;

    // Update AABB values based on new position
    updateAABB(bodyIndex);
}

export function integrateVerletVelocity(bodyIndex: number, dt: number): void {
    const oldAx = accelerationX[bodyIndex];
    const oldAy = accelerationY[bodyIndex];

    const invM = invMass[bodyIndex];
    const newAx = forceSumX[bodyIndex] * invM;
    const newAy = forceSumY[bodyIndex] * invM;
    const newAz = forceSumZ[bodyIndex] * invM;

    velocityX[bodyIndex] += 0.5 * (oldAx + newAx) * dt;
    velocityY[bodyIndex] += 0.5 * (oldAy + newAy) * dt;
    velocityZ[bodyIndex] += 0.5 * (oldAy + newAz) * dt;

    // store for next step
    accelerationX[bodyIndex] = newAx;
    accelerationY[bodyIndex] = newAy;
    accelerationZ[bodyIndex] = newAz;

    clearForces(bodyIndex);
}

export function updateAABB(bodyIndex: number) {
    const radius = radii[bodyIndex];
    aabbMinX[bodyIndex] = positionX[bodyIndex] - radius;
    aabbMaxX[bodyIndex] = positionX[bodyIndex] + radius;

    aabbMinY[bodyIndex] = positionY[bodyIndex] - radius;
    aabbMaxY[bodyIndex] = positionY[bodyIndex] + radius;

    aabbMinZ[bodyIndex] = positionZ[bodyIndex] - radius;
    aabbMaxZ[bodyIndex] = positionZ[bodyIndex] + radius;
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
