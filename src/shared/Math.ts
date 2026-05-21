import { G } from './Constants';
import { Vec3 } from './Vec3';

/**
 * Computes orbital velocity for an elliptical orbit.
 *
 * Uses the vis-viva equation:
 *
 * v = sqrt( μ * (2/r - 1/a) )
 *
 * μ = G(M + m)
 * r = current distance from focus
 * a = semi-major axis
 */
export function getOrbitalSpeed(
    centerPos: Vec3,
    centerMass: number,
    bodyPosition: Vec3,
    bodyMass: number,
    semiMajorAxisKm: number,
    orbitNormal: Vec3 = new Vec3(0, 0, 1),
): Vec3 {
    const rVec = bodyPosition.subNew(centerPos);
    const r = rVec.magnitude();

    const mu = G * (centerMass + bodyMass);

    // Vis-viva equation
    const speed = Math.sqrt(mu * (2 / r - 1 / semiMajorAxisKm));

    const radialDir = rVec.unitVector();
    const normal = orbitNormal.unitVector();

    const tangent = normal.crossNew(radialDir).unitVector();

    return tangent.scaleNew(speed);
}

/**
 * @param semiMajorAxisKm For a circular orbit = orbit radius, for an ellipse = half of the longest diameter
 * @param eccentricity 0 → circle, 0.1 → slightly elliptical, 0.5 → very elliptical, must be < 1 for closed elliptical orbit
 * @param anomalyDeg 0 = periapsis (nearest point), 180 = apoapsis (farthest point)
 * @param inclination In degrees
 * @returns
 */
export function getOrbitPosition(
    semiMajorAxisKm: number,
    eccentricity: number,
    anomalyDeg: number,
    inclination: number = 0,
): Vec3 {
    const e = clamp(eccentricity, 0, 0.999);
    const f = degreesToRadians(anomalyDeg);

    const p = semiMajorAxisKm * (1 - e * e);
    const r = p / (1 + e * Math.cos(f));

    const x = Math.cos(f) * r;
    const y = Math.sin(f) * r;
    const z = 0;

    const inclinationRadians = degreesToRadians(inclination);
    const cos = Math.cos(inclinationRadians);
    const sin = Math.sin(inclinationRadians);

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

function createHoneycombLayer(radius: number, rings: number, z: number, offsetX = 0, offsetY = 0): Vec3[] {
    const points: Vec3[] = [];

    points.push(new Vec3(offsetX, offsetY, z));

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
                const x = radius * 2 * (q + s / 2) + offsetX;
                const y = radius * Math.sqrt(3) * s + offsetY;

                points.push(new Vec3(x, y, z));

                q += dir.q;
                s += dir.s;
            }
        }
    }

    return points;
}

/**
 * Creates as many spheres as possible in a stacked honeycomb arrangement inside a sphere radius.
 */
export function createHoneycombInSphere(sphereRadius: number, bodyRadius: number): Vec3[] {
    const points: Vec3[] = [];

    const maxCenterDistance = sphereRadius - bodyRadius;

    if (maxCenterDistance < 0) {
        return points;
    }

    const layerHeight = Math.sqrt(8 / 3) * bodyRadius;
    const maxLayers = Math.floor(maxCenterDistance / layerHeight);
    const maxRings = Math.ceil(maxCenterDistance / (bodyRadius * 2));

    for (let layer = -maxLayers; layer <= maxLayers; layer++) {
        const z = layer * layerHeight;

        const oddLayer = Math.abs(layer) % 2 === 1;

        const offsetX = oddLayer ? bodyRadius : 0;
        const offsetY = oddLayer ? (Math.sqrt(3) * bodyRadius) / 3 : 0;

        const candidates = createHoneycombLayer(bodyRadius, maxRings, z, offsetX, offsetY);

        for (const p of candidates) {
            if (Math.hypot(p.x, p.y, p.z) <= maxCenterDistance) {
                points.push(p);
            }
        }
    }

    return points;
}
