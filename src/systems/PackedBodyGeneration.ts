import AssetStore from '../AssetStore';
import { BodyType } from '../Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from '../BodyRenderStyle';
import { EARTH_RADIUS_KM, G } from '../Constants';
import {
    clamp,
    getOrbitPosition,
    getOrbitalSpeedByBodyId,
    getOrbitalSpeedByBodyPositionAndMass,
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
import { BeltSpec, CelestialBodySpec, CelestialBodySpecDeprecated, SolarSystemSpec } from './BodySpec';

export function createPackedSolarSystem(
    solarSystemSpec: SolarSystemSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): void {
    const barycenter = computeBarycenter(solarSystemSpec.stars);
    const barycenterPos = barycenter.centerPos;
    const barycenterMass = barycenter.massKg;

    for (const star of solarSystemSpec.stars) {
        const starId = createPackedBody(
            star,
            BodyType.STAR,
            barycenterPos,
            new Vec2(), // TODO: what if the barycenter has a velocity?
            barycenterMass,
        );
        renderStyles.set(starId, createRenderStyle(star, BodyType.STAR));
    }

    for (const planetSpec of solarSystemSpec.planets) {
        const planetId = createPackedBody(planetSpec, BodyType.PLANET, barycenterPos, new Vec2(), barycenterMass);
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
        createPackedBelt(barycenterPos, barycenterMass, beltSpec, renderStyles);
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
    // TODO: if we have a barycentric position orbit is added twice to the position
    const bodyPos = parentPos.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0));
    const bodyMass = spec.massKg;
    const bodyId = addNewBody(bodyPos.x, bodyPos.y, spec.radiusKm, bodyMass, bodyType, new Vec2(), parentId);

    if (spec.orbitRadiusKm) {
        const orbitalSpeed = parentVel.addNew(
            getOrbitalSpeedByBodyPositionAndMass(parentPos, parentMass, bodyPos, bodyMass),
        );

        const bodyIndex = bodyIndexById[bodyId];
        velocityX[bodyIndex] = orbitalSpeed.x;
        velocityY[bodyIndex] = orbitalSpeed.y;
    }

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

function computeBarycenter(stars: CelestialBodySpec[]) {
    let totalMass = 0;

    let x = 0;
    let y = 0;
    const center = new Vec2();

    for (const star of stars) {
        totalMass += star.massKg;

        const starPos = center.addNew(getOrbitPosition(star.orbitRadiusKm ?? 0, star.orbitAngleDegrees ?? 0));

        x += starPos.x * star.massKg;
        y += starPos.y * star.massKg;
    }

    x /= totalMass;
    y /= totalMass;

    return {
        massKg: totalMass,
        centerPos: new Vec2(x, y),
    };
}
