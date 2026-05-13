import AssetStore from '../AssetStore';
import { BodyType } from '../Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from '../BodyRenderStyle';
import { EARTH_RADIUS_KM, G } from '../Constants';
import { clamp, getOrbitPosition, getOrbitalSpeedByBodyId, getOrbitalSpeedByParentId, randomNumber } from '../Math';
import { BodyId, addNewBody, bodyIndexById, positionX, positionY, velocityX, velocityY } from '../PackedBody';
import { Vec2 } from '../Vec2';
import { BeltSpec, CelestialBodySpecDeprecated } from './BodySpec';

export function createBody(spec: CelestialBodySpecDeprecated, bodyType: BodyType, parentId: number | null = null): BodyId {
    if (parentId === null) {
        return addNewBody(0, 0, spec.radiusKm, spec.massKg, bodyType);
    }

    const parentIndex = bodyIndexById[parentId];
    const parentPos = new Vec2(positionX[parentIndex], positionY[parentIndex]);
    const parentVel = new Vec2(velocityX[parentIndex], velocityY[parentIndex]);

    const bodyPos = parentPos.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0));
    const bodyId = addNewBody(bodyPos.x, bodyPos.y, spec.radiusKm, spec.massKg, bodyType, new Vec2(), parentId);
    const orbitalSpeed = parentVel.addNew(getOrbitalSpeedByParentId(parentId, bodyId, G));

    const bodyIndex = bodyIndexById[bodyId];
    velocityX[bodyIndex] = orbitalSpeed.x;
    velocityY[bodyIndex] = orbitalSpeed.y;

    return bodyId;
}

export function createBelt(
    centerPos: Vec2,
    centerMass: number,
    spec: BeltSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): void {
    for (let i = 0; i < spec.numBodies; i++) {
        const position = getOrbitPosition(
            randomNumber(spec.innerOrbitRadiusKm, spec.outerOrbitRadiusKm),
            randomNumber(0, 360),
        );

        const asteroidId = addNewBody(
            position.x,
            position.y,
            randomNumber(spec.minRadiusKm, spec.maxRadiusKm),
            randomNumber(spec.minMassKg, spec.maxMassKg),
            BodyType.ASTEROID,
        );

        const fillColor = spec.colors[Math.floor(randomNumber(0, spec.colors.length))];

        const asteroidVelocity = getOrbitalSpeedByBodyId(centerPos, centerMass, asteroidId, G);
        const asteroidIndex = bodyIndexById[asteroidId];
        velocityX[asteroidIndex] = asteroidVelocity.x;
        velocityY[asteroidIndex] = asteroidVelocity.y;

        renderStyles.set(asteroidId, {
            ...DEFAULT_BODY_RENDER_STYLE,
            fillColor,
        });
    }
}

export function createRenderStyle(spec: CelestialBodySpecDeprecated, bodyType: BodyType): BodyRenderStyle {
    return {
        fillColor: spec.color,
        texture: spec.texture ? AssetStore.getTexture(spec.texture) : null,
        label: spec.name,
        labelColor: spec.labelColor ?? getDefaultLabelColor(spec, bodyType),
        labelFontSize: spec.labelFontSize ?? getLabelFontSize(spec, bodyType),
    };
}

export function getDefaultLabelColor(spec: CelestialBodySpecDeprecated, bodyType: BodyType): string {
    if (bodyType === BodyType.MOON) {
        return 'rgba(255, 255, 255, 0.78)';
    }

    return spec.color;
}

export function getLabelFontSize(spec: CelestialBodySpecDeprecated, bodyType: BodyType): number {
    if (bodyType === BodyType.STAR) {
        return 20;
    }

    if (bodyType === BodyType.PLANET) {
        return 16;
    }

    if (bodyType === BodyType.MOON) {
        return 12;
    }

    return Math.round(clamp(10 + Math.sqrt(spec.radiusKm / EARTH_RADIUS_KM) * 2, 11, 17));
}
