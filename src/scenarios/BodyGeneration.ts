import { EARTH_RADIUS_KM, G } from '../shared/Constants';
import {
    clamp,
    getOrbitPosition,
    getOrbitalSpeedByBodyId,
    getOrbitalSpeedByBodyPositionAndMass,
    randomNumber,
} from '../shared/Math';
import { Vec2 } from '../shared/Vec2';
import {
    BodyId,
    BodyType,
    NO_PARENT,
    addNewBody,
    bodyIndexById,
    mass,
    positionX,
    positionY,
    velocityX,
    velocityY,
} from '../sim/Body';
import AssetStore from '../view/AssetStore';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE, getBodyRenderRadius } from '../view/BodyRenderStyle';
import { BeltSpec, CelestialBodySpec, SolarSystemSpec } from './BodySpec';

export function createSolarSystem(
    solarSystemSpec: SolarSystemSpec,
    renderStyles: Map<number, BodyRenderStyle>,
    basePos = new Vec2(),
    baseVel = new Vec2(),
): void {
    const mainStarId = createBody(solarSystemSpec.mainStar, BodyType.STAR, basePos, baseVel);
    const mainStarIndex = bodyIndexById[mainStarId];
    const mainStarPos = new Vec2(positionX[mainStarIndex], positionY[mainStarIndex]);
    const mainStarVel = new Vec2(velocityX[mainStarIndex], velocityY[mainStarIndex]);
    const mainStarMass = mass[mainStarIndex];
    renderStyles.set(mainStarId, createRenderStyle(solarSystemSpec.mainStar, BodyType.STAR));

    for (const starSpec of solarSystemSpec.secondaryStars) {
        const starId = createBody(starSpec, BodyType.STAR, mainStarPos, mainStarVel, mainStarMass);
        renderStyles.set(starId, createRenderStyle(starSpec, BodyType.STAR));
    }

    for (const planetSpec of solarSystemSpec.planets) {
        const planetId = createBody(planetSpec, BodyType.PLANET, mainStarPos, mainStarVel, mainStarMass);
        renderStyles.set(planetId, createRenderStyle(planetSpec, BodyType.PLANET));

        const planetIndex = bodyIndexById[planetId];
        const planetPos = new Vec2(positionX[planetIndex], positionY[planetIndex]);
        const planetVel = new Vec2(velocityX[planetIndex], velocityY[planetIndex]);
        const planetMass = mass[planetIndex];

        for (const moonSpec of planetSpec.moons ?? []) {
            const moonId = createBody(moonSpec, BodyType.MOON, planetPos, planetVel, planetMass, planetId);
            renderStyles.set(moonId, createRenderStyle(moonSpec, BodyType.MOON));
        }
    }

    for (const beltSpec of solarSystemSpec.belts) {
        createBelt(mainStarPos, mainStarMass, mainStarVel, beltSpec, renderStyles);
    }
}

export function createBody(
    spec: CelestialBodySpec,
    bodyType: BodyType,
    parentPos: Vec2 = new Vec2(),
    parentVel: Vec2 = new Vec2(),
    parentMass: number = 0,
    parentId: number = NO_PARENT,
): BodyId {
    // TODO: if we have a barycentric position orbit is added twice to the position
    const bodyPos = parentPos.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0));
    const bodyVel = parentVel.copy();
    const bodyMass = spec.massKg;
    const bodyId = addNewBody(bodyPos.x, bodyPos.y, spec.radiusKm, bodyMass, bodyType, bodyVel, parentId);

    if (spec.orbitRadiusKm) {
        const orbitalSpeed = bodyVel.addNew(
            getOrbitalSpeedByBodyPositionAndMass(parentPos, parentMass, bodyPos, bodyMass),
        );

        const bodyIndex = bodyIndexById[bodyId];
        velocityX[bodyIndex] = orbitalSpeed.x;
        velocityY[bodyIndex] = orbitalSpeed.y;
    }

    return bodyId;
}

export function createBelt(
    centerPos: Vec2,
    centerMass: number,
    centerVel: Vec2,
    spec: BeltSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): void {
    for (let i = 0; i < spec.numBodies; i++) {
        const position = centerPos.addNew(
            getOrbitPosition(randomNumber(spec.innerOrbitRadiusKm, spec.outerOrbitRadiusKm), randomNumber(0, 360)),
        );

        const asteroidId = addNewBody(
            position.x,
            position.y,
            randomNumber(spec.minRadiusKm, spec.maxRadiusKm),
            randomNumber(spec.minMassKg, spec.maxMassKg),
            BodyType.ASTEROID,
        );

        const fillColor = spec.colors[Math.floor(randomNumber(0, spec.colors.length))];

        const asteroidVelocity = centerVel.addNew(getOrbitalSpeedByBodyId(centerPos, centerMass, asteroidId, G));
        const asteroidIndex = bodyIndexById[asteroidId];
        velocityX[asteroidIndex] = asteroidVelocity.x;
        velocityY[asteroidIndex] = asteroidVelocity.y;

        renderStyles.set(asteroidId, {
            ...DEFAULT_BODY_RENDER_STYLE,
            fillColor,
        });
    }
}

export function createRenderStyle(spec: CelestialBodySpec, bodyType: BodyType): BodyRenderStyle {
    return {
        fillColor: spec.color,
        texture: spec.texture ? AssetStore.getTexture(spec.texture) : null,
        label: spec.name,
        labelColor: spec.labelColor ?? getDefaultLabelColor(spec, bodyType),
        labelFontSize: spec.labelFontSize ?? getLabelFontSize(spec, bodyType),
        renderRadius: getBodyRenderRadius(spec.radiusKm, bodyType),
    };
}

export function getDefaultLabelColor(spec: CelestialBodySpec, bodyType: BodyType): string {
    if (bodyType === BodyType.MOON) {
        return 'rgba(255, 255, 255, 0.78)';
    }

    return spec.color;
}

export function getLabelFontSize(spec: CelestialBodySpec, bodyType: BodyType): number {
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
