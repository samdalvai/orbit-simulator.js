import { MAX_BODIES } from '../shared/Constants';
import { createHoneycombInCircle } from '../shared/Math';
import { Vec3 } from '../shared/Vec3';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from '../view/BodyRenderStyle';
import {
    BodyType,
    addNewBody,
    applyImpulseLinear,
    bodyIndexById,
    bodyTypes,
    getBodyCount,
    invMass,
    mass,
    positionX,
    positionY,
    positionZ,
    radii,
    removeBody,
    updateAABB,
    velocityX,
    velocityY,
} from './Body';

export type Collision = {
    normal: Vec3;
    penetration: number;
};

export function detectCircleCollision(aIndex: number, bIndex: number): Collision | null {
    const dx = positionX[bIndex] - positionX[aIndex];
    const dy = positionY[bIndex] - positionY[aIndex];
    const dz = positionZ[bIndex] - positionZ[aIndex];

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
        normal: new Vec3(nx, ny), // from A → B
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

    applyImpulseLinear(aIndex, new Vec3(-impulseX, -impulseY));
    applyImpulseLinear(bIndex, new Vec3(impulseX, impulseY));
}

export function resolvePosition(aIndex: number, bIndex: number, collision: Collision, bias = 0.5): void {
    const minRadius = Math.min(radii[aIndex], radii[bIndex]);

    const slop = minRadius * 0.01; // 1% of smaller body's radius

    const invMassSum = invMass[aIndex] + invMass[bIndex];
    if (invMassSum === 0) return;

    const correctionMag = (Math.max(collision.penetration - slop, 0) / invMassSum) * bias;

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
export function computeImpactEnergy(aIndex: number, bIndex: number, normal: Vec3): number {
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

export function explodeBody(bodyId: number, bodyRenderStyles: Map<number, BodyRenderStyle>) {
    const index = bodyIndexById[bodyId];

    if (bodyTypes[index] === BodyType.ASTEROID || bodyTypes[index] === BodyType.BLACK_HOLE) return;

    const radius = radii[index];
    const bodyMass = mass[index];

    const posX = positionX[index];
    const posY = positionY[index];
    const velX = velocityX[index];
    const velY = velocityY[index];

    const numOfDebris = getDebrisCount(radius, 1, radius, 4, 100);

    if (getBodyCount() + numOfDebris >= MAX_BODIES) return;

    const circlesRadius = radius / Math.sqrt(numOfDebris);
    const circles = createHoneycombInCircle(radius, circlesRadius);
    const circlesMass = bodyMass / circles.length;

    const bodyStyle = bodyRenderStyles.get(bodyId) ?? DEFAULT_BODY_RENDER_STYLE;
    const colors = ['#8f7a66', '#6f6258', '#a08b72', '#5a514c'];

    for (const c of circles) {
        const debrisId = addNewBody(
            posX + c.x,
            posY + c.y,
            circlesRadius,
            circlesMass,
            BodyType.ASTEROID,
            new Vec3(velX, velY),
        );
        const colorIndex = Math.floor(Math.random() * 4);
        bodyRenderStyles.set(debrisId, {
            fillColor: colors[colorIndex],
            texture: null,
            label: bodyStyle.label ? 'Debris of ' + bodyStyle.label : 'Debris',
            labelColor: '',
            labelFontSize: 0,
            renderRadius: (bodyStyle.renderRadius / radius) * circlesRadius,
        });
    }

    removeBody(bodyId);
    bodyRenderStyles.delete(bodyId);
}
