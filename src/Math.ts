import { Body } from './Body';
import { Vec2 } from './Vec2';

/**
 * Computes the tangential velocity for a circular orbit of `planet` around `sun`.
 *
 * Uses: v = sqrt(G * (M + m) / r)
 * - M = sun mass
 * - m = planet mass
 * - r = distance between bodies
 *
 * The returned vector is perpendicular to the radius (tangential direction).
 */
export function getOrbitalSpeed(sun: Body, planet: Body, G: number): Vec2 {
    const rVec = planet.position.subNew(sun.position);
    const r = rVec.magnitude();
    const v = Math.sqrt((G * (sun.mass + planet.mass)) / r);
    const dir = planet.position.subNew(sun.position).unitVector();
    const tangent = dir.perpNew();

    return tangent.scaleNew(v);
}

export function randomNumber(min: number = 1.0, max: number = 10.0): number {
    return Math.random() * (max - min) + min;
}

export function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(value, high));
}
