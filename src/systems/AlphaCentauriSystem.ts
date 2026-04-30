import { Body, BodyType } from '../Body';
import { BodyRenderStyle } from '../BodyRenderStyle';
import { AU_KM, G } from '../Constants';
import { Engine } from '../Engine';
import { getOrbitPosition } from '../Math';
import { CelestialBodySpec, SolarSystem } from './BodySpec';
import { createBody, createRenderStyle } from './BodyGeneration';

const ALPHA_CENTAURI_A: CelestialBodySpec = {
    name: 'Alpha Centauri A',
    radiusKm: 847_014.75,
    massKg: 2.145161436e30,
    color: '#fff6bf',
    labelFontSize: 18,
    texture: 'alphaCentauriA',
};

const ALPHA_CENTAURI_B: CelestialBodySpec = {
    name: 'Alpha Centauri B',
    radiusKm: 597_675.87,
    massKg: 1.807916924e30,
    color: '#ffd28a',
    labelFontSize: 18,
    texture: 'alphaCentauriB',
};

const PROXIMA_CENTAURI: CelestialBodySpec = {
    name: 'Proxima Centauri',
    radiusKm: 107_276.94,
    massKg: 2.42792187e29,
    color: '#ff6f5e',
    labelColor: '#ff9a8c',
    labelFontSize: 16,
    texture: 'proximaCentauri',
};

const ALPHA_CENTAURI_AB_ORBIT = {
    semiMajorAxisKm: 23.2989267 * AU_KM,
    eccentricity: 0.51947,
};

const PROXIMA_CENTAURI_ORBIT = {
    semiMajorAxisKm: 8_700 * AU_KM,
    eccentricity: 0.5,
};

const PROXIMA_CENTAURI_PLANETS: CelestialBodySpec[] = [
    {
        name: 'Proxima Centauri d',
        radiusKm: 4_408.732,
        massKg: 1.55272e24,
        orbitRadiusKm: 0.02881 * AU_KM,
        orbitAngleDegrees: 35,
        color: '#a78f7d',
        labelColor: '#e0cbbb',
        texture: 'proximaCentauriD',
    },
    {
        name: 'Proxima Centauri b',
        radiusKm: 6_498.42,
        massKg: 6.30046e24,
        orbitRadiusKm: 0.04848 * AU_KM,
        orbitAngleDegrees: 220,
        color: '#74b7d7',
        labelColor: '#a7def3',
        texture: 'proximaCentauriB',
    },
];

export function createAlphaCentauriSystem(engine: Engine): SolarSystem {
    const bodies: Body[] = [];
    const renderStyles = new Map<number, BodyRenderStyle>();

    const { primary: alphaCentauriA, secondary: alphaCentauriB } = createBinaryStarsAtApsis(
        ALPHA_CENTAURI_A,
        ALPHA_CENTAURI_B,
        ALPHA_CENTAURI_AB_ORBIT.semiMajorAxisKm,
        ALPHA_CENTAURI_AB_ORBIT.eccentricity,
        'periapsis',
    );
    bodies.push(alphaCentauriA, alphaCentauriB);
    renderStyles.set(alphaCentauriA.id, createRenderStyle(ALPHA_CENTAURI_A, BodyType.STAR));
    renderStyles.set(alphaCentauriB.id, createRenderStyle(ALPHA_CENTAURI_B, BodyType.STAR));

    const proximaCentauri = createOuterStarAtApsis(
        PROXIMA_CENTAURI,
        alphaCentauriA.mass + alphaCentauriB.mass,
        PROXIMA_CENTAURI_ORBIT.semiMajorAxisKm,
        PROXIMA_CENTAURI_ORBIT.eccentricity,
        'apoapsis',
        165,
    );
    bodies.push(proximaCentauri);
    renderStyles.set(proximaCentauri.id, createRenderStyle(PROXIMA_CENTAURI, BodyType.STAR));

    for (const planetSpec of PROXIMA_CENTAURI_PLANETS) {
        const planet = createBody(planetSpec, BodyType.PLANET, proximaCentauri);
        bodies.push(planet);
        renderStyles.set(planet.id, createRenderStyle(planetSpec, BodyType.PLANET));
    }

    for (const body of bodies) {
        engine.addBody(body);
    }

    return { bodies, renderStyles };
}

function createBinaryStarsAtApsis(
    primarySpec: CelestialBodySpec,
    secondarySpec: CelestialBodySpec,
    semiMajorAxisKm: number,
    eccentricity: number,
    apsis: 'periapsis' | 'apoapsis',
): { primary: Body; secondary: Body } {
    const totalMassKg = primarySpec.massKg + secondarySpec.massKg;
    const separationKm = getApsisDistance(semiMajorAxisKm, eccentricity, apsis);
    const relativeSpeedKmS = getApsisSpeed(totalMassKg, semiMajorAxisKm, eccentricity, apsis);
    const primary = new Body(
        (-separationKm * secondarySpec.massKg) / totalMassKg,
        0,
        primarySpec.radiusKm,
        primarySpec.massKg,
        BodyType.STAR,
    );
    const secondary = new Body(
        (separationKm * primarySpec.massKg) / totalMassKg,
        0,
        secondarySpec.radiusKm,
        secondarySpec.massKg,
        BodyType.STAR,
    );

    primary.velocity.y = (relativeSpeedKmS * secondary.mass) / totalMassKg;
    secondary.velocity.y = (-relativeSpeedKmS * primary.mass) / totalMassKg;

    return { primary, secondary };
}

function createOuterStarAtApsis(
    spec: CelestialBodySpec,
    parentMassKg: number,
    semiMajorAxisKm: number,
    eccentricity: number,
    apsis: 'periapsis' | 'apoapsis',
    orbitAngleDegrees: number,
): Body {
    const separationKm = getApsisDistance(semiMajorAxisKm, eccentricity, apsis);
    const position = getOrbitPosition(separationKm, orbitAngleDegrees);
    const star = new Body(position.x, position.y, spec.radiusKm, spec.massKg, BodyType.STAR);
    const speedKmS = getApsisSpeed(parentMassKg + star.mass, semiMajorAxisKm, eccentricity, apsis);

    star.velocity = position.unitVector().perpNew().scaleNew(speedKmS);

    return star;
}

function getApsisDistance(semiMajorAxisKm: number, eccentricity: number, apsis: 'periapsis' | 'apoapsis'): number {
    return semiMajorAxisKm * (apsis === 'periapsis' ? 1 - eccentricity : 1 + eccentricity);
}

function getApsisSpeed(
    totalMassKg: number,
    semiMajorAxisKm: number,
    eccentricity: number,
    apsis: 'periapsis' | 'apoapsis',
): number {
    const distanceKm = getApsisDistance(semiMajorAxisKm, eccentricity, apsis);
    const apsisFactor = apsis === 'periapsis' ? 1 + eccentricity : 1 - eccentricity;

    return Math.sqrt((G * totalMassKg * apsisFactor) / distanceKm);
}
