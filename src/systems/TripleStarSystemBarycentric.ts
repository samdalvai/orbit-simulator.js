import { Body, BodyType } from '../Body';
import { BodyRenderStyle } from '../BodyRenderStyle';
import { AU_KM, G } from '../Constants';
import { getOrbitPosition } from '../Math';
import { Engine } from '../PackedEngine';
import { Vec2 } from '../Vec2';
import { createBelt, createBody, createRenderStyle } from './BodyGeneration';
import { BeltSpec, CelestialBodySpecDeprecated } from './BodySpec';

const STAR_A: CelestialBodySpecDeprecated = {
    name: 'Aureon',
    radiusKm: 720_000,
    massKg: 1.35e30,
    color: '#fff0a6',
    labelFontSize: 18,
    texture: 'planetSun',
};

const STAR_B: CelestialBodySpecDeprecated = {
    name: 'Vesper',
    radiusKm: 420_000,
    massKg: 1.35e30,
    orbitRadiusKm: 0.2 * AU_KM,
    orbitAngleDegrees: 30,
    color: '#ffb45f',
    labelFontSize: 18,
    texture: 'alphaCentauriB',
};

const STAR_C: CelestialBodySpecDeprecated = {
    name: 'Sable',
    radiusKm: 500_000,
    massKg: 1.35e30,
    orbitRadiusKm: 0.4 * AU_KM,
    orbitAngleDegrees: 200,
    color: '#ff7059',
    labelFontSize: 18,
    texture: 'proximaCentauri',
};

const PLANETS: CelestialBodySpecDeprecated[] = [
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
        numBodies: 1500,
        colors: ['#8f7a66', '#6f6258', '#a08b72', '#5a514c', '#c8d6df', '#9eb3c0', '#dfe8ec', '#8093a0'],
    },
];

export function createTripleStarSystem(engine: Engine, bodyRenderStyles: Map<number, BodyRenderStyle>) {
    const bodies: Body[] = [];
    const sunA = createBody(STAR_A, BodyType.STAR);
    bodies.push(sunA);
    bodyRenderStyles.set(sunA.id, createRenderStyle(STAR_A, BodyType.STAR));

    const sunB = createBody(STAR_B, BodyType.STAR, sunA);
    bodies.push(sunB);
    bodyRenderStyles.set(sunB.id, createRenderStyle(STAR_B, BodyType.STAR));

    const sunC = createBody(STAR_C, BodyType.STAR, sunA);
    bodies.push(sunC);
    bodyRenderStyles.set(sunC.id, createRenderStyle(STAR_C, BodyType.STAR));

    const centralMassKg = sunA.mass + sunB.mass + sunC.mass;

    for (const planetSpec of PLANETS) {
        const planet = createBarycentricOrbitBody(planetSpec, BodyType.PLANET, centralMassKg);
        bodies.push(planet);
        bodyRenderStyles.set(planet.id, createRenderStyle(planetSpec, BodyType.PLANET));

        for (const moonSpec of planetSpec.moons ?? []) {
            const moon = createBody(moonSpec, BodyType.MOON, planet);
            bodies.push(moon);
            bodyRenderStyles.set(moon.id, createRenderStyle(moonSpec, BodyType.MOON));
        }
    }

    const startsCenter = centroid([sunA.position, sunB.position, sunC.position]);

    for (const beltSpec of BELTS) {
        bodies.push(...createBelt(startsCenter, centralMassKg, beltSpec, bodyRenderStyles));
    }

    for (const body of bodies) {
        engine.addBody(body);
    }
}

function centroid(points: Vec2[]): Vec2 {
    const n = points.length;
    if (n === 0) return new Vec2();

    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < n; i++) {
        sumX += points[i].x;
        sumY += points[i].y;
    }
    const x = sumX / n;
    const y = sumY / n;
    return new Vec2(x, y);
}

function createBarycentricOrbitBody(spec: CelestialBodySpecDeprecated, bodyType: BodyType, centralMassKg: number): Body {
    const position = getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0);
    const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, bodyType);
    const orbitRadiusKm = position.magnitude();

    if (orbitRadiusKm > 0) {
        const orbitalSpeedKmS = Math.sqrt((G * (centralMassKg + body.mass)) / orbitRadiusKm);
        body.velocity = position.unitVector().perpNew().scaleNew(orbitalSpeedKmS);
    }

    return body;
}
