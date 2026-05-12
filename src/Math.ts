import { Body } from './Body';
import { bodyIndexById, mass, positionX, positionY } from './PackedBody';
import { Vec2 } from './Vec2';

/**
 * Computes the tangential velocity for a circular orbit of `planet` around a point with mass (normally another body).
 *
 * Uses: v = sqrt(G * (M + m) / r)
 * - M = sun mass
 * - m = planet mass
 * - r = distance between bodies
 *
 * The returned vector is perpendicular to the radius (tangential direction).
 */
export function getOrbitalSpeed(centerPos: Vec2, centerMass: number, planet: Body, G: number): Vec2 {
    const rVec = planet.position.subNew(centerPos);
    const r = rVec.magnitude();
    const v = Math.sqrt((G * (centerMass + planet.mass)) / r);
    const dir = planet.position.subNew(centerPos).unitVector();
    const tangent = dir.perpNew();

    return tangent.scaleNew(v);
}

export function getOrbitalSpeedByPlanetId(centerPos: Vec2, centerMass: number, planetId: number, G: number): Vec2 {
    const planetIndex = bodyIndexById[planetId];
    const planetPos = new Vec2(positionX[planetIndex], positionY[planetIndex]);

    const rVec = planetPos.subNew(centerPos);
    const r = rVec.magnitude();
    const v = Math.sqrt((G * (centerMass + mass[planetIndex])) / r);
    const dir = planetPos.subNew(centerPos).unitVector();
    const tangent = dir.perpNew();

    return tangent.scaleNew(v);
}

export function getOrbitalSpeedByParent(parent: Body, planet: Body, G: number): Vec2 {
    return getOrbitalSpeed(parent.position, parent.mass, planet, G);
}

export function getOrbitalSpeedByParentId(parentId: number, planetId: number, G: number): Vec2 {
    const parentIndex = bodyIndexById[parentId];
    const parentPos = new Vec2(positionX[parentIndex], positionY[parentIndex]);
    const parentMass = mass[parentIndex];

    return getOrbitalSpeedByPlanetId(parentPos, parentMass, planetId, G);
}

/**
 *
 * @param distance In km
 * @param angle In degrees
 * @returns Orbit distance with an angle
 */
export function getOrbitPosition(distance: number, angle: number): Vec2 {
    const radians = degreesToRadians(angle);
    return new Vec2(Math.cos(radians) * distance, Math.sin(radians) * distance);
}

export function randomNumber(min: number = 1.0, max: number = 10.0): number {
    return Math.random() * (max - min) + min;
}

export function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(value, high));
}

export function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}
