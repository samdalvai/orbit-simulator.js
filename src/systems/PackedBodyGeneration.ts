import AssetStore from '../AssetStore';
import { BodyType } from '../Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from '../BodyRenderStyle';
import { EARTH_RADIUS_KM, G } from '../Constants';
import {
    clamp,
    getOrbitPosition,
    getOrbitalSpeedByBodyId,
    getOrbitalSpeedByBodyPositionAndMass,
    getOrbitalSpeedByParentId,
    randomNumber,
} from '../Math';
import {
    BodyId,
    NO_PARENT,
    addNewBody,
    bodyIndexById,
    mass,
    positionX,
    positionY,
    velocityX,
    velocityY,
} from '../PackedBody';
import { Vec2 } from '../Vec2';
import { BeltSpec, CelestialBodySpecDeprecated, SolarSystemSpec } from './BodySpec';

export function createPackedSolarSystem(
    solarSystemSpec: SolarSystemSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): void {
    const starId = createPackedBody(solarSystemSpec.stars[0], BodyType.STAR);
    renderStyles.set(starId, createRenderStyle(solarSystemSpec.stars[0], BodyType.STAR));

    const starIndex = bodyIndexById[starId];
    const starPos = new Vec2(positionX[starIndex], positionY[starIndex]);
    const starVel = new Vec2(velocityX[starIndex], velocityY[starIndex]);
    const starMass = mass[starIndex];

    for (const planetSpec of solarSystemSpec.planets) {
        const planetId = createPackedBody(planetSpec, BodyType.PLANET, starPos, starVel, starMass);
        renderStyles.set(planetId, createRenderStyle(planetSpec, BodyType.PLANET));

        const planetIndex = bodyIndexById[planetId];
        const planetPos = new Vec2(positionX[planetIndex], positionY[planetIndex]);
        const planetVel = new Vec2(velocityX[planetIndex], velocityY[planetIndex]);
        const planetMass = mass[planetIndex];

        for (const moonSpec of planetSpec.moons ?? []) {
            const moonId = createPackedBody(moonSpec, BodyType.MOON, planetPos, planetVel, planetMass, planetId);
            renderStyles.set(moonId, createRenderStyle(moonSpec, BodyType.MOON));
        }
    }

    for (const beltSpec of solarSystemSpec.belts) {
        createPackedBelt(starPos, starMass, beltSpec, renderStyles);
    }
}

export function createPackedBody(
    spec: CelestialBodySpecDeprecated,
    bodyType: BodyType,
    parentPos: Vec2 = new Vec2(),
    parentVel: Vec2 = new Vec2(),
    parentMass: number = 0,
    parentId: number = NO_PARENT,
): BodyId {
    // if (parentId === null) {
    //     const zero = new Vec2();
    //     const bodyPos = zero.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0));
    //     return addNewBody(bodyPos.x, bodyPos.y, spec.radiusKm, spec.massKg, bodyType);
    // }

    // if (parentPos === null || parentVel === null || parentMass === null) {
    //     throw new Error('Some parent property is missing');
    // }

    // const parentIndex = bodyIndexById[parentId];
    // const parentPos = new Vec2(positionX[parentIndex], positionY[parentIndex]);
    // const parentVel = new Vec2(velocityX[parentIndex], velocityY[parentIndex]);
    // const parentMass = mass[parentIndex];

    const bodyPos = parentPos.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0));
    const bodyMass = spec.massKg;
    const bodyId = addNewBody(bodyPos.x, bodyPos.y, spec.radiusKm, bodyMass, bodyType, new Vec2(), parentId);

    // TODO: if parent position is (0,0) this method produces Infinite orbital speed
    const orbitalSpeed = parentVel.addNew(
        getOrbitalSpeedByBodyPositionAndMass(parentPos, parentMass, bodyPos, bodyMass),
    );

    console.log("orbitalSpeed: ", orbitalSpeed);
    console.log("parentVel: ", parentVel);

    const bodyIndex = bodyIndexById[bodyId];
    velocityX[bodyIndex] = orbitalSpeed.x;
    velocityY[bodyIndex] = orbitalSpeed.y;

    return bodyId;
}

export function createPackedBelt(
    centerPos: Vec2,
    centerMass: number,
    spec: BeltSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): void {
    // TODO: this method ignores centerPos for asteroid positioning
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
