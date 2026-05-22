import { MAX_BODIES } from '../shared/Constants';
import { createHoneycombInSphere } from '../shared/Math';
import { Vec3 } from '../shared/Vec3';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from '../view/BodyRenderStyle';
import {
    BODY_NOT_CREATED,
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
    velocityZ,
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
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq >= radiusSum * radiusSum) {
        return null;
    }

    const dist = Math.sqrt(distSq);

    // Safe normal (avoid NaN if perfectly overlapping)
    const nx = dist > 0 ? dx / dist : 1;
    const ny = dist > 0 ? dy / dist : 0;
    const nz = dist > 0 ? dz / dist : 0;

    return {
        normal: new Vec3(nx, ny, nz), // from A → B
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
    const rvz = velocityZ[bIndex] - velocityZ[aIndex];

    const velAlongNormal = rvx * n.x + rvy * n.y + rvz * n.z;

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
    const impulseZ = j * n.z;

    applyImpulseLinear(aIndex, new Vec3(-impulseX, -impulseY, -impulseZ));
    applyImpulseLinear(bIndex, new Vec3(impulseX, impulseY, impulseZ));
}

export function resolvePosition(aIndex: number, bIndex: number, collision: Collision, bias = 0.5): void {
    const minRadius = Math.min(radii[aIndex], radii[bIndex]);

    const slop = minRadius * 0.01; // 1% of smaller body's radius

    const invMassSum = invMass[aIndex] + invMass[bIndex];
    if (invMassSum === 0) return;

    const correctionMag = (Math.max(collision.penetration - slop, 0) / invMassSum) * bias;

    const cx = correctionMag * collision.normal.x;
    const cy = correctionMag * collision.normal.y;
    const cz = correctionMag * collision.normal.z;

    positionX[aIndex] -= cx * invMass[aIndex];
    positionY[aIndex] -= cy * invMass[aIndex];
    positionZ[aIndex] -= cz * invMass[aIndex];

    positionX[bIndex] += cx * invMass[bIndex];
    positionY[bIndex] += cy * invMass[bIndex];
    positionZ[bIndex] -= cz * invMass[aIndex];

    updateAABB(aIndex);
    updateAABB(bIndex);
}

/**
 * Impact energy in kg * (km/s)^2
 */
export function computeImpactEnergy(aIndex: number, bIndex: number, normal: Vec3): number {
    const rvx = velocityX[bIndex] - velocityX[aIndex];
    const rvy = velocityY[bIndex] - velocityY[aIndex];
    const rvz = velocityZ[bIndex] - velocityZ[aIndex];

    const impactSpeed = Math.abs(rvx * normal.x + rvy * normal.y + rvz * normal.z);

    const reducedMass = (mass[aIndex] * mass[bIndex]) / (mass[aIndex] + mass[bIndex]);

    return 0.5 * reducedMass * impactSpeed * impactSpeed;
}

/**
 * Computes how many debris fragments should be generated for a body
 * based on its radius.
 *
 * The interpolation is performed in logarithmic space so that very
 * small and very large celestial bodies scale more naturally.
 *
 * Example:
 * - Small asteroid  -> few debris
 * - Planet          -> medium debris count
 * - Star            -> many debris
 *
 * @param radiusKm Radius of the body being destroyed, in kilometers.
 * @param minRadiusKm Radius at which the minimum debris count is reached.
 *                    Bodies smaller than this will still generate minDebris.
 * @param maxRadiusKm Radius at which the maximum debris count is reached.
 *                    Bodies larger than this will still generate maxDebris.
 * @param minDebris Minimum number of debris fragments to generate.
 * @param maxDebris Maximum number of debris fragments to generate.
 *
 * @returns Number of debris fragments to generate.
 */
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
    const posZ = positionZ[index];

    const velX = velocityX[index];
    const velY = velocityY[index];
    const velZ = velocityZ[index];

    const numOfDebris = getDebrisCount(radius, 1, radius, 4, 150);

    if (getBodyCount() + numOfDebris >= MAX_BODIES) return;

    const circlesRadius = radius / Math.cbrt(numOfDebris);
    const circles = createHoneycombInSphere(radius, circlesRadius);
    const circlesMass = bodyMass / circles.length;

    const bodyStyle = bodyRenderStyles.get(bodyId) ?? DEFAULT_BODY_RENDER_STYLE;
    const colors = ['#8f7a66', '#6f6258', '#a08b72', '#5a514c'];

    for (const c of circles) {
        const debrisId = addNewBody(
            posX + c.x,
            posY + c.y,
            posZ + c.z,
            circlesRadius,
            circlesMass,
            BodyType.ASTEROID,
            new Vec3(velX, velY, velZ),
        );

        if (debrisId === BODY_NOT_CREATED) break;

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
