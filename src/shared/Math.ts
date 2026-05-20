import { G } from './Constants';
import { Vec3 } from './Vec3';

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
export function getOrbitalSpeedByBodyPositionAndMass(
    centerPos: Vec3,
    centerMass: number,
    bodyPosition: Vec3,
    bodyMass: number,
    orbitNormal: Vec3 = new Vec3(0, 0, 1), // flat orbit normal
): Vec3 {
    const rVec = bodyPosition.subNew(centerPos);
    const r = rVec.magnitude();

    const speed = Math.sqrt((G * (centerMass + bodyMass)) / r);

    const radialDir = rVec.unitVector();
    const normal = orbitNormal.unitVector();

    const tangent = normal.crossNew(radialDir).unitVector();

    return tangent.scaleNew(speed);
}

/**
 *
 * @param distance In km
 * @param angle In degrees
 * @param inclination In degrees
 * @returns Orbit distance with an angle
 */
export function getOrbitPosition(distance: number, angle: number, inclination: number = 0): Vec3 {
    const radians = degreesToRadians(angle);
    const inclinationRadians = degreesToRadians(inclination);

    const x = Math.cos(radians) * distance;
    const y = Math.sin(radians) * distance;
    const z = 0;

    const cos = Math.cos(inclinationRadians);
    const sin = Math.sin(inclinationRadians);

    // rotate around X axis
    const tiltedY = y * cos - z * sin;
    const tiltedZ = y * sin + z * cos;

    return new Vec3(x, tiltedY, tiltedZ);
}

export function getXYOrbitNormal(inclination: number = 0): Vec3 {
    const radians = degreesToRadians(inclination);

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // normal of x/y plane rotated around X axis
    return new Vec3(0, -sin, cos);
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

function createHoneycombCircles(radius: number, rings: number): Vec3[] {
    const points: Vec3[] = [];

    points.push(new Vec3());

    const directions = [
        { q: -1, s: 1 },
        { q: -1, s: 0 },
        { q: 0, s: -1 },
        { q: 1, s: -1 },
        { q: 1, s: 0 },
        { q: 0, s: 1 },
    ];

    for (let ring = 1; ring <= rings; ring++) {
        let q = ring;
        let s = 0;

        for (const dir of directions) {
            for (let step = 0; step < ring; step++) {
                const x = radius * 2 * (q + s / 2);
                const y = radius * Math.sqrt(3) * s;

                points.push(new Vec3(x, y));

                q += dir.q;
                s += dir.s;
            }
        }
    }

    return points;
}

/**
 * Creates as many circles as possible in a honeycomb arrangement inside a body radius
 */
export function createHoneycombInCircle(circleRadius: number, bodyRadius: number): Vec3[] {
    const points: Vec3[] = [];

    const maxRings = Math.ceil(circleRadius / (bodyRadius * 2));

    const candidates = createHoneycombCircles(bodyRadius, maxRings);

    for (const p of candidates) {
        if (Math.hypot(p.x, p.y) + bodyRadius <= circleRadius) {
            points.push(p);
        }
    }

    return points;
}
