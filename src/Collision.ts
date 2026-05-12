import { Body } from './Body';
import { applyImpulseLinear, invMasses, posX, posY, radiuses, updateAABB, velX, velY } from './PackedBody';
import { Vec2 } from './Vec2';

type Collision = {
    normal: Vec2;
    penetration: number;
};

export function detectCircleCollision(aIndex: number, bIndex: number): Collision | null {
    const dx = posX[bIndex] - posX[aIndex];
    const dy = posY[bIndex] - posY[aIndex];

    const radiusSum = radiuses[aIndex] + radiuses[bIndex];
    const distSq = dx * dx + dy * dy;

    if (distSq >= radiusSum * radiusSum) {
        return null;
    }

    const dist = Math.sqrt(distSq);

    // Safe normal (avoid NaN if perfectly overlapping)
    const nx = dist > 0 ? dx / dist : 1;
    const ny = dist > 0 ? dy / dist : 0;

    return {
        normal: new Vec2(nx, ny), // from A → B
        penetration: radiusSum - dist,
    };
}

export function resolveCollision(
    aIndex: number,
    bIndex: number,
    collision: Collision,
    restitution = 0.2, // 0 = inelastic, 1 = elastic
): void {
    const n = collision.normal;

    const rvx = velX[bIndex] - velX[aIndex];
    const rvy = velY[bIndex] - velY[aIndex];

    const velAlongNormal = rvx * n.x + rvy * n.y;

    // Already separating → do nothing
    if (velAlongNormal > 0) {
        return;
    }

    const invMassSum = invMasses[aIndex] + invMasses[bIndex];
    if (invMassSum === 0) {
        return;
    }

    const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

    const impulseX = j * n.x;
    const impulseY = j * n.y;

    applyImpulseLinear(aIndex, new Vec2(-impulseX, -impulseY));
    applyImpulseLinear(bIndex, new Vec2(impulseX, impulseY));
}

export function positionalCorrection(aIndex: number, bIndex: number, collision: Collision): void {
    const percent = 0.8; // correction strength
    const slop = 0.01; // small tolerance

    const invMassSum = invMasses[aIndex] + invMasses[bIndex];
    if (invMassSum === 0) return;

    const correctionMag = (Math.max(collision.penetration - slop, 0) / invMassSum) * percent;

    const cx = correctionMag * collision.normal.x;
    const cy = correctionMag * collision.normal.y;

    posX[aIndex] -= cx * invMasses[aIndex];
    posY[aIndex] -= cy * invMasses[aIndex];

    posX[bIndex] += cx * invMasses[bIndex];
    posY[bIndex] += cy * invMasses[bIndex];

    updateAABB(aIndex);
    updateAABB(bIndex);
}

/**
 * Impact energy in kg * (km/s)^2
 */
export function computeImpactEnergy(a: Body, b: Body, normal: Vec2): number {
    const rvx = b.velocity.x - a.velocity.x;
    const rvy = b.velocity.y - a.velocity.y;

    const impactSpeed = Math.abs(rvx * normal.x + rvy * normal.y);

    const reducedMass = (a.mass * b.mass) / (a.mass + b.mass);

    return 0.5 * reducedMass * impactSpeed * impactSpeed;
}
