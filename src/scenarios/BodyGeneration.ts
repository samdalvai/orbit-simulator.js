import { EARTH_RADIUS_KM } from '../shared/Constants';
import {
    clamp,
    getOrbitPosition,
    getOrbitalSpeed,
    getXYOrbitNormal,
    randomNumber,
} from '../shared/Math';
import { Vec3 } from '../shared/Vec3';
import {
    BodyId,
    BodyType,
    NO_PARENT,
    addNewBody,
    bodyIndexById,
    mass,
    positionX,
    positionY,
    positionZ,
    velocityX,
    velocityY,
    velocityZ,
} from '../sim/Body';
import AssetStore from '../view/AssetStore';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE, getBodyRenderRadius } from '../view/BodyRenderStyle';
import { BeltSpec, CelestialBodySpec, SolarSystemSpec } from './BodySpec';

export function createSolarSystem(
    solarSystemSpec: SolarSystemSpec,
    renderStyles: Map<number, BodyRenderStyle>,
    basePos = new Vec3(),
    baseVel = new Vec3(),
): void {
    const mainStarId = createBody(solarSystemSpec.mainStar, BodyType.STAR, basePos, baseVel);
    const mainStarIndex = bodyIndexById[mainStarId];
    const mainStarPos = new Vec3(positionX[mainStarIndex], positionY[mainStarIndex], positionZ[mainStarIndex]);
    const mainStarVel = new Vec3(velocityX[mainStarIndex], velocityY[mainStarIndex], velocityZ[mainStarIndex]);
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
        const planetPos = new Vec3(positionX[planetIndex], positionY[planetIndex]);
        const planetVel = new Vec3(velocityX[planetIndex], velocityY[planetIndex]);
        const planetMass = mass[planetIndex];

        for (const moonSpec of planetSpec.moons ?? []) {
            const moonId = createBody(moonSpec, BodyType.MOON, planetPos, planetVel, planetMass, planetId);
            renderStyles.set(moonId, createRenderStyle(moonSpec, BodyType.MOON));
        }
    }

    for (const beltSpec of solarSystemSpec.belts) {
        createBelt(mainStarPos, mainStarMass, mainStarVel, beltSpec, renderStyles);
    }

    for (const cometSpec of solarSystemSpec.comets) {
        const cometId = createBody(cometSpec, BodyType.COMET, mainStarPos, mainStarVel, mainStarMass);
        renderStyles.set(cometId, createRenderStyle(cometSpec, BodyType.COMET));
    }
}

export function createBody(
    spec: CelestialBodySpec,
    bodyType: BodyType,
    parentPos: Vec3 = new Vec3(),
    parentVel: Vec3 = new Vec3(),
    parentMass: number = 0,
    parentId: number = NO_PARENT,
): BodyId {
    const orbitRadius = spec.orbitRadiusKm ?? 0;
    const orbitAngle = spec.orbitAngleDegrees ?? 0;
    const orbitTilt = spec.orbitTiltDegrees ?? 0;
    const eccentricity = spec.orbitEccentricity ?? 0;

    const bodyPos = parentPos.addNew(getOrbitPosition(orbitRadius, eccentricity, orbitAngle, orbitTilt));
    const bodyVel = parentVel.copy();
    const bodyMass = spec.massKg;

    const bodyId = addNewBody(bodyPos.x, bodyPos.y, bodyPos.z, spec.radiusKm, bodyMass, bodyType, bodyVel, parentId);

    if (spec.orbitRadiusKm) {
        const orbitalSpeed = bodyVel.addNew(
            getOrbitalSpeed(
                parentPos,
                parentMass,
                bodyPos,
                bodyMass,
                orbitRadius,
                getXYOrbitNormal(orbitTilt),
            ),
        );

        const bodyIndex = bodyIndexById[bodyId];
        velocityX[bodyIndex] = orbitalSpeed.x;
        velocityY[bodyIndex] = orbitalSpeed.y;
        velocityZ[bodyIndex] = orbitalSpeed.z;
    }

    return bodyId;
}

export function createBelt(
    centerPos: Vec3,
    centerMass: number,
    centerVel: Vec3,
    spec: BeltSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): void {
    for (let i = 0; i < spec.numBodies; i++) {
        const semiMajorAxisKm = randomNumber(spec.innerOrbitRadiusKm, spec.outerOrbitRadiusKm);
        const eccentricity = spec.orbitEccentricity ?? 0;
        const orbitTilt = spec.orbitTiltDegrees ?? 0;
        const anomaly = randomNumber(0, 360);
        const orbitNormal = getXYOrbitNormal(orbitTilt);

        const asteroidPosition = centerPos.addNew(
            getOrbitPosition(semiMajorAxisKm, eccentricity, anomaly, orbitTilt),
        );

        const asteroidMass = randomNumber(spec.minMassKg, spec.maxMassKg);

        const asteroidId = addNewBody(
            asteroidPosition.x,
            asteroidPosition.y,
            asteroidPosition.z,
            randomNumber(spec.minRadiusKm, spec.maxRadiusKm),
            asteroidMass,
            BodyType.ASTEROID,
        );

        const asteroidVelocity = centerVel.addNew(
            getOrbitalSpeed(
                centerPos,
                centerMass,
                asteroidPosition,
                asteroidMass,
                semiMajorAxisKm,
                orbitNormal,
            ),
        );

        const asteroidIndex = bodyIndexById[asteroidId];

        velocityX[asteroidIndex] = asteroidVelocity.x;
        velocityY[asteroidIndex] = asteroidVelocity.y;
        velocityZ[asteroidIndex] = asteroidVelocity.z;

        const fillColor = spec.colors[Math.floor(randomNumber(0, spec.colors.length))];

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
