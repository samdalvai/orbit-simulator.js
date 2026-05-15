import { Vec2 } from '../shared/Vec2';
import {
    applyImpulseLinear,
    invMass,
    mass,
    positionX,
    positionY,
    radii,
    updateAABB,
    velocityX,
    velocityY,
} from './Body';

export type Collision = {
    aIndex: number;
    bIndex: number;
    normal: Vec2;
    penetration: number;
};

export function detectCircleCollision(aIndex: number, bIndex: number): Collision | null {
    const dx = positionX[bIndex] - positionX[aIndex];
    const dy = positionY[bIndex] - positionY[aIndex];

    const radiusSum = radii[aIndex] + radii[bIndex];
    const distSq = dx * dx + dy * dy;

    if (distSq >= radiusSum * radiusSum) {
        return null;
    }

    const dist = Math.sqrt(distSq);

    // Safe normal (avoid NaN if perfectly overlapping)
    const nx = dist > 0 ? dx / dist : 1;
    const ny = dist > 0 ? dy / dist : 0;

    return {
        aIndex: aIndex,
        bIndex: bIndex,
        normal: new Vec2(nx, ny), // from A → B
        penetration: radiusSum - dist,
    };
}

export function resolveCollision(
    collision: Collision,
    restitution = 0.2, // 0 = inelastic, 1 = elastic
): void {
    const aIndex = collision.aIndex;
    const bIndex = collision.bIndex;
    const n = collision.normal;

    const rvx = velocityX[bIndex] - velocityX[aIndex];
    const rvy = velocityY[bIndex] - velocityY[aIndex];

    const velAlongNormal = rvx * n.x + rvy * n.y;

    // Already separating → do nothing
    if (velAlongNormal > 0) {
        return;
    }

    const invMassSum = invMass[aIndex] + invMass[bIndex];
    if (invMassSum === 0) {
        return;
    }

    const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

    const impulseX = j * n.x;
    const impulseY = j * n.y;

    applyImpulseLinear(aIndex, new Vec2(-impulseX, -impulseY));
    applyImpulseLinear(bIndex, new Vec2(impulseX, impulseY));
}

export function positionalCorrection(collision: Collision): void {
    const aIndex = collision.aIndex;
    const bIndex = collision.bIndex;
    const minRadius = Math.min(radii[aIndex], radii[bIndex]);

    const percent = 1; // correction strength
    const slop = minRadius * 0.01; // 1% of smaller body's radius

    const invMassSum = invMass[aIndex] + invMass[bIndex];
    if (invMassSum === 0) return;

    const correctionMag = (Math.max(collision.penetration - slop, 0) / invMassSum) * percent;

    const cx = correctionMag * collision.normal.x;
    const cy = correctionMag * collision.normal.y;

    positionX[aIndex] -= cx * invMass[aIndex];
    positionY[aIndex] -= cy * invMass[aIndex];

    positionX[bIndex] += cx * invMass[bIndex];
    positionY[bIndex] += cy * invMass[bIndex];

    updateAABB(aIndex);
    updateAABB(bIndex);
}

/**
 * Impact energy in kg * (km/s)^2
 */
export function computeImpactEnergy(aIndex: number, bIndex: number, normal: Vec2): number {
    const rvx = velocityX[bIndex] - velocityX[aIndex];
    const rvy = velocityY[bIndex] - velocityY[aIndex];

    const impactSpeed = Math.abs(rvx * normal.x + rvy * normal.y);

    const reducedMass = (mass[aIndex] * mass[bIndex]) / (mass[aIndex] + mass[bIndex]);

    return 0.5 * reducedMass * impactSpeed * impactSpeed;
}

export function getDebrisCount(
    radiusKm: number,
    minRadiusKm: number,
    maxRadiusKm: number,
    minDebris: number,
    maxDebris: number,
): number {
    const logMin = Math.log10(minRadiusKm);
    const logMax = Math.log10(maxRadiusKm);
    const logRadius = Math.log10(radiusKm);

    const t = Math.min(Math.max((logRadius - logMin) / (logMax - logMin), 0), 1);

    return Math.round(minDebris + t * (maxDebris - minDebris));
}
