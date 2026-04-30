import { Body, BodyType } from '../Body';
import { BodyRenderStyle } from '../BodyRenderStyle';
import { AU_KM, G } from '../Constants';
import { Engine } from '../Engine';
import { getOrbitPosition } from '../Math';
import { BeltSpec, CelestialBodySpec, SolarSystem } from './BodySpec';
import { createBelt, createBody, createRenderStyle } from './SystemGeneration';

const IMAGINARY_TRIPLE_STAR_ORBIT_RADIUS_KM = 0.32 * AU_KM;

const IMAGINARY_TRIPLE_STARS: CelestialBodySpec[] = [
    {
        name: 'Aureon',
        radiusKm: 720_000,
        massKg: 1.35e30,
        color: '#fff0a6',
        labelFontSize: 18,
        texture: 'planetSun',
    },
    {
        name: 'Vesper',
        radiusKm: 620_000,
        massKg: 1.35e30,
        color: '#ffb45f',
        labelFontSize: 18,
        texture: 'alphaCentauriB',
    },
    {
        name: 'Sable',
        radiusKm: 500_000,
        massKg: 1.35e30,
        color: '#ff7059',
        labelFontSize: 18,
        texture: 'proximaCentauri',
    },
];

const IMAGINARY_TRIPLE_PLANETS: CelestialBodySpec[] = [
    {
        name: 'Cinder',
        radiusKm: 3_180,
        massKg: 3.8e23,
        orbitRadiusKm: 1.0 * AU_KM,
        orbitAngleDegrees: 25,
        color: '#b79a7c',
        texture: 'planetMercury',
    },
    {
        name: 'Marisol',
        radiusKm: 6_740,
        massKg: 6.7e24,
        orbitRadiusKm: 1.48 * AU_KM,
        orbitAngleDegrees: 115,
        color: '#5ea6d8',
        texture: 'planetEarth',
        moons: [
            {
                name: 'Marisol I',
                radiusKm: 1_420,
                massKg: 4.8e22,
                orbitRadiusKm: 310_000,
                orbitAngleDegrees: 260,
                color: '#c4c7be',
                texture: 'moonLuna',
            },
        ],
    },
    {
        name: 'Rusk',
        radiusKm: 4_260,
        massKg: 8.1e23,
        orbitRadiusKm: 2.15 * AU_KM,
        orbitAngleDegrees: 205,
        color: '#c56c4c',
        texture: 'planetMars',
    },
    {
        name: 'Tethra',
        radiusKm: 28_900,
        massKg: 9.4e25,
        orbitRadiusKm: 3.05 * AU_KM,
        orbitAngleDegrees: 295,
        color: '#91d9ce',
        texture: 'planetUranus',
    },
    {
        name: 'Orison',
        radiusKm: 54_300,
        massKg: 4.7e26,
        orbitRadiusKm: 4.2 * AU_KM,
        orbitAngleDegrees: 60,
        color: '#d5bc84',
        texture: 'planetSaturn',
        moons: [
            {
                name: 'Orison I',
                radiusKm: 2_110,
                massKg: 8.5e22,
                orbitRadiusKm: 860_000,
                orbitAngleDegrees: 140,
                color: '#d0b48a',
                texture: 'moonTitan',
            },
            {
                name: 'Orison II',
                radiusKm: 760,
                massKg: 2.7e21,
                orbitRadiusKm: 1_430_000,
                orbitAngleDegrees: 315,
                color: '#a8a097',
                texture: 'moonRhea',
            },
        ],
    },
    {
        name: 'Nadir',
        radiusKm: 24_100,
        massKg: 8.8e25,
        orbitRadiusKm: 5.4 * AU_KM,
        orbitAngleDegrees: 155,
        color: '#597fe7',
        texture: 'planetNeptune',
    },
];

const BELTS: BeltSpec[] = [
    {
        innerOrbitRadiusKm: 2.95 * AU_KM,
        outerOrbitRadiusKm: 3.35 * AU_KM,
        minRadiusKm: 15,
        maxRadiusKm: 260,
        minMassKg: 1e14,
        maxMassKg: 8e18,
        numBodies: 5000,
        colors: ['#8f7a66', '#6f6258', '#a08b72', '#5a514c', '#c8d6df', '#9eb3c0', '#dfe8ec', '#8093a0'],
    },
];

export function createTripleStarSystem(engine: Engine): SolarSystem {
    const bodies: Body[] = [];
    const renderStyles = new Map<number, BodyRenderStyle>();
    const stars = createEquilateralTripleStars(IMAGINARY_TRIPLE_STARS, IMAGINARY_TRIPLE_STAR_ORBIT_RADIUS_KM);
    const centralMassKg = stars.reduce((sum, star) => sum + star.mass, 0);

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const spec = IMAGINARY_TRIPLE_STARS[i];
        bodies.push(star);
        renderStyles.set(star.id, createRenderStyle(spec, BodyType.STAR));
    }

    for (const planetSpec of IMAGINARY_TRIPLE_PLANETS) {
        const planet = createBarycentricOrbitBody(planetSpec, BodyType.PLANET, centralMassKg);
        bodies.push(planet);
        renderStyles.set(planet.id, createRenderStyle(planetSpec, BodyType.PLANET));

        for (const moonSpec of planetSpec.moons ?? []) {
            const moon = createBody(moonSpec, BodyType.MOON, planet);
            bodies.push(moon);
            renderStyles.set(moon.id, createRenderStyle(moonSpec, BodyType.MOON));
        }
    }

    for (const beltSpec of BELTS) {
        bodies.push(...createBelt(stars[0], beltSpec, renderStyles));
    }

    for (const body of bodies) {
        engine.addBody(body);
    }

    return { bodies, renderStyles };
}

function createEquilateralTripleStars(specs: CelestialBodySpec[], orbitRadiusKm: number): Body[] {
    const bodies: Body[] = [];
    const orbitAngles = [90, 210, 330];
    const sharedMassKg = specs[0]?.massKg ?? 0;
    const orbitalSpeedKmS = Math.sqrt((G * sharedMassKg) / (Math.sqrt(3) * orbitRadiusKm));

    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const position = getOrbitPosition(orbitRadiusKm, orbitAngles[i] ?? 0);
        const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, BodyType.STAR);
        body.velocity = position.unitVector().perpNew().scaleNew(orbitalSpeedKmS);
        bodies.push(body);
    }

    return bodies;
}

function createBarycentricOrbitBody(spec: CelestialBodySpec, bodyType: BodyType, centralMassKg: number): Body {
    const position = getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0);
    const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, bodyType);
    const orbitRadiusKm = position.magnitude();

    if (orbitRadiusKm > 0) {
        const orbitalSpeedKmS = Math.sqrt((G * (centralMassKg + body.mass)) / orbitRadiusKm);
        body.velocity = position.unitVector().perpNew().scaleNew(orbitalSpeedKmS);
    }

    return body;
}
