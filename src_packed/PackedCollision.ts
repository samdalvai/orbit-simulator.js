import { Body } from './Body';
import { Vec2 } from './Vec2';

type Collision = {
    normal: Vec2;
    penetration: number;
};

export function detectCircleCollision(a: Body, b: Body): Collision | null {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;

    const radiusSum = a.radius + b.radius;
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
    a: Body,
    b: Body,
    collision: Collision,
    restitution = 0.2, // 0 = inelastic, 1 = elastic
): void {
    const n = collision.normal;

    const rvx = b.velocity.x - a.velocity.x;
    const rvy = b.velocity.y - a.velocity.y;

    const velAlongNormal = rvx * n.x + rvy * n.y;

    // Already separating → do nothing
    if (velAlongNormal > 0) {
        return;
    }

    const invMassSum = a.invMass + b.invMass;
    if (invMassSum === 0) {
        return;
    }

    const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

    const impulseX = j * n.x;
    const impulseY = j * n.y;

    a.applyImpulseLinear(new Vec2(-impulseX, -impulseY));
    b.applyImpulseLinear(new Vec2(impulseX, impulseY));
}

export function positionalCorrection(a: Body, b: Body, collision: Collision): void {
    const percent = 0.8; // correction strength
    const slop = 0.01; // small tolerance

    const invMassSum = a.invMass + b.invMass;
    if (invMassSum === 0) return;

    const correctionMag = (Math.max(collision.penetration - slop, 0) / invMassSum) * percent;

    const cx = correctionMag * collision.normal.x;
    const cy = correctionMag * collision.normal.y;

    a.position.x -= cx * a.invMass;
    a.position.y -= cy * a.invMass;

    b.position.x += cx * b.invMass;
    b.position.y += cy * b.invMass;

    a.updateAABB();
    b.updateAABB();
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
