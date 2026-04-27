import { TEXTURES } from './AssetStore';
import { Body, BodyType } from './Body';
import { G } from './Constants';
import { Engine } from './Engine';
import { getOrbitPosition, getOrbitalSpeed } from './Math';

type TextureName = keyof typeof TEXTURES;

type CelestialBodySpec = {
    name: string;
    radiusKm: number;
    massKg: number;
    color: string;
    texture?: TextureName;
    orbitRadiusKm?: number;
    orbitAngleDegrees?: number;
    moons?: CelestialBodySpec[];
};

const SUN: CelestialBodySpec = {
    name: 'Sun',
    radiusKm: 695_700,
    massKg: 1.98847e30,
    color: '#fff7b2',
    texture: 'planetSun',
};

const PLANETS: CelestialBodySpec[] = [
    {
        name: 'Mercury',
        radiusKm: 2_439.7,
        massKg: 3.3011e23,
        orbitRadiusKm: 57_909_227,
        orbitAngleDegrees: 15,
        color: '#b7ada5',
        texture: 'planetMercury',
    },
    {
        name: 'Venus',
        radiusKm: 6_051.8,
        massKg: 4.8675e24,
        orbitRadiusKm: 108_209_475,
        orbitAngleDegrees: 105,
        color: '#d8b16f',
        texture: 'planetVenus',
    },
    {
        name: 'Earth',
        radiusKm: 6_371,
        massKg: 5.972e24,
        orbitRadiusKm: 149_597_870.7,
        orbitAngleDegrees: 190,
        color: '#4a9fe8',
        texture: 'planetEarth',
        moons: [
            {
                name: 'Moon',
                radiusKm: 1_737.4,
                massKg: 7.342e22,
                orbitRadiusKm: 384_400,
                orbitAngleDegrees: 250,
                color: 'gray',
            },
        ],
    },
    {
        name: 'Mars',
        radiusKm: 3_389.5,
        massKg: 6.4171e23,
        orbitRadiusKm: 227_943_824,
        orbitAngleDegrees: 280,
        color: '#c76245',
        texture: 'planetMars',
    },
    {
        name: 'Jupiter',
        radiusKm: 69_911,
        massKg: 1.8982e27,
        orbitRadiusKm: 778_340_821,
        orbitAngleDegrees: 335,
        color: '#d1a06f',
        texture: 'planetJupiter',
    },
    {
        name: 'Saturn',
        radiusKm: 58_232,
        massKg: 5.6834e26,
        orbitRadiusKm: 1_426_666_422,
        orbitAngleDegrees: 55,
        color: '#d7c28b',
        texture: 'planetSaturn',
    },
    {
        name: 'Uranus',
        radiusKm: 25_362,
        massKg: 8.681e25,
        orbitRadiusKm: 2_870_658_186,
        orbitAngleDegrees: 145,
        color: '#9fe1df',
        texture: 'planetUranus',
    },
    {
        name: 'Neptune',
        radiusKm: 24_622,
        massKg: 1.02413e26,
        orbitRadiusKm: 4_498_396_441,
        orbitAngleDegrees: 245,
        color: '#5279e8',
        texture: 'planetNeptune',
    },
];

export function createSolarSystem(engine: Engine): Body[] {
    const bodies: Body[] = [];
    const sun = createBody(SUN, BodyType.STAR);
    bodies.push(sun);

    for (const planetSpec of PLANETS) {
        const planet = createBody(planetSpec, BodyType.PLANET, sun);
        bodies.push(planet);

        for (const moonSpec of planetSpec.moons ?? []) {
            bodies.push(createBody(moonSpec, BodyType.MOON, planet));
        }
    }

    for (const body of bodies) {
        engine.addBody(body);
    }

    return bodies;
}

function createBody(spec: CelestialBodySpec, bodyType: BodyType, parent: Body | null = null): Body {
    const position = parent
        ? parent.position.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0))
        : getOrbitPosition(0, 0);

    const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, bodyType);
    body.parent = parent;
    body.fillColor = spec.color;
    body.label = spec.name;

    if (spec.texture) {
        body.texture = spec.texture;
    }

    if (parent) {
        body.velocity = parent.velocity.addNew(getOrbitalSpeed(parent, body, G));
    }

    return body;
}
