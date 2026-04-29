import AssetStore, { TEXTURES } from './AssetStore';
import { Body, BodyType } from './Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from './BodyRenderStyle';
import { AU_KM, EARTH_RADIUS_KM, G } from './Constants';
import { Engine } from './Engine';
import { clamp, getOrbitPosition, getOrbitalSpeed, randomNumber } from './Math';

const ASTEROID_BELT_OBJECTS = 4000;
const KUIPER_BELT_OBJECTS = 5000;
const IMAGINARY_TRIPLE_STAR_ORBIT_RADIUS_KM = 0.32 * AU_KM;

type TextureName = keyof typeof TEXTURES;

type CelestialBodySpec = {
    name: string;
    radiusKm: number;
    massKg: number;
    color: string;
    labelColor?: string;
    labelFontSize?: number;
    texture?: TextureName;
    orbitRadiusKm?: number;
    orbitAngleDegrees?: number;
    moons?: CelestialBodySpec[];
};

type BeltSpec = {
    innerOrbitRadiusKm: number;
    outerOrbitRadiusKm: number;
    minRadiusKm: number;
    maxRadiusKm: number;
    minMassKg: number;
    maxMassKg: number;
    numBodies: number;
    colors: string[];
};

export type SolarSystem = {
    bodies: Body[];
    renderStyles: Map<number, BodyRenderStyle>;
};

const SUN: CelestialBodySpec = {
    name: 'Sun',
    radiusKm: 695_700,
    massKg: 1.98847e30,
    color: '#fff7b2',
    texture: 'planetSun',
};

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
                color: '#b8b8b1',
                texture: 'moonLuna',
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
        moons: [
            {
                name: 'Phobos',
                radiusKm: 11.1,
                massKg: 1.06e16,
                orbitRadiusKm: 9_378,
                orbitAngleDegrees: 40,
                color: '#8f7a69',
                texture: 'moonPhobos',
            },
            {
                name: 'Deimos',
                radiusKm: 6.2,
                massKg: 2.4e15,
                orbitRadiusKm: 23_459,
                orbitAngleDegrees: 220,
                color: '#a29486',
                texture: 'moonDeimos',
            },
        ],
    },
    {
        name: 'Jupiter',
        radiusKm: 69_911,
        massKg: 1.8982e27,
        orbitRadiusKm: 778_340_821,
        orbitAngleDegrees: 335,
        color: '#d1a06f',
        texture: 'planetJupiter',
        moons: [
            {
                name: 'Io',
                radiusKm: 1_821.5,
                massKg: 8.932e22,
                orbitRadiusKm: 421_800,
                orbitAngleDegrees: 25,
                color: '#f4d35e',
                texture: 'moonIo',
            },
            {
                name: 'Europa',
                radiusKm: 1_560.8,
                massKg: 4.8e22,
                orbitRadiusKm: 671_100,
                orbitAngleDegrees: 120,
                color: '#d7cab6',
                texture: 'moonEuropa',
            },
            {
                name: 'Ganymede',
                radiusKm: 2_631.2,
                massKg: 1.4819e23,
                orbitRadiusKm: 1_070_400,
                orbitAngleDegrees: 210,
                color: '#9a8b7a',
                texture: 'moonGanymede',
            },
            {
                name: 'Callisto',
                radiusKm: 2_410.3,
                massKg: 1.0759e23,
                orbitRadiusKm: 1_882_700,
                orbitAngleDegrees: 305,
                color: '#5b5149',
                texture: 'moonCallisto',
            },
        ],
    },
    {
        name: 'Saturn',
        radiusKm: 58_232,
        massKg: 5.6834e26,
        orbitRadiusKm: 1_426_666_422,
        orbitAngleDegrees: 55,
        color: '#d7c28b',
        texture: 'planetSaturn',
        moons: [
            {
                name: 'Enceladus',
                radiusKm: 252.1,
                massKg: 1.08e20,
                orbitRadiusKm: 238_020,
                orbitAngleDegrees: 35,
                color: '#f0f7ff',
                texture: 'moonEnceladus',
            },
            {
                name: 'Rhea',
                radiusKm: 763.5,
                massKg: 2.31e21,
                orbitRadiusKm: 527_040,
                orbitAngleDegrees: 240,
                color: '#b9b9b2',
                texture: 'moonRhea',
            },
            {
                name: 'Titan',
                radiusKm: 2_574.8,
                massKg: 1.3455e23,
                orbitRadiusKm: 1_221_870,
                orbitAngleDegrees: 145,
                color: '#d49b4f',
                texture: 'moonTitan',
            },
            {
                name: 'Iapetus',
                radiusKm: 734.3,
                massKg: 1.81e21,
                orbitRadiusKm: 3_560_850,
                orbitAngleDegrees: 315,
                color: '#9a8a75',
                texture: 'moonIapetus',
            },
        ],
    },
    {
        name: 'Uranus',
        radiusKm: 25_362,
        massKg: 8.681e25,
        orbitRadiusKm: 2_870_658_186,
        orbitAngleDegrees: 145,
        color: '#9fe1df',
        texture: 'planetUranus',
        moons: [
            {
                name: 'Miranda',
                radiusKm: 235.8,
                massKg: 6.6e19,
                orbitRadiusKm: 129_900,
                orbitAngleDegrees: 15,
                color: '#aeb4b8',
                texture: 'moonMiranda',
            },
            {
                name: 'Ariel',
                radiusKm: 578.9,
                massKg: 1.29e21,
                orbitRadiusKm: 190_900,
                orbitAngleDegrees: 95,
                color: '#c7cdd0',
                texture: 'moonAriel',
            },
            {
                name: 'Umbriel',
                radiusKm: 584.7,
                massKg: 1.22e21,
                orbitRadiusKm: 266_000,
                orbitAngleDegrees: 175,
                color: '#6c7178',
                texture: 'moonUmbriel',
            },
            {
                name: 'Titania',
                radiusKm: 788.9,
                massKg: 3.42e21,
                orbitRadiusKm: 436_300,
                orbitAngleDegrees: 255,
                color: '#a79f96',
                texture: 'moonTitania',
            },
            {
                name: 'Oberon',
                radiusKm: 761.4,
                massKg: 2.88e21,
                orbitRadiusKm: 583_500,
                orbitAngleDegrees: 325,
                color: '#8b837d',
                texture: 'moonOberon',
            },
        ],
    },
    {
        name: 'Neptune',
        radiusKm: 24_622,
        massKg: 1.02413e26,
        orbitRadiusKm: 4_498_396_441,
        orbitAngleDegrees: 245,
        color: '#5279e8',
        texture: 'planetNeptune',
        moons: [
            {
                name: 'Triton',
                radiusKm: 1_353.4,
                massKg: 2.14e22,
                orbitRadiusKm: 354_760,
                orbitAngleDegrees: 80,
                color: '#d6e0dd',
                texture: 'moonTriton',
            },
        ],
    },
];

const BELTS: BeltSpec[] = [
    {
        innerOrbitRadiusKm: 2.15 * AU_KM,
        outerOrbitRadiusKm: 3.35 * AU_KM,
        minRadiusKm: 15,
        maxRadiusKm: 260,
        minMassKg: 1e14,
        maxMassKg: 8e18,
        numBodies: ASTEROID_BELT_OBJECTS,
        colors: ['#8f7a66', '#6f6258', '#a08b72', '#5a514c'],
    },
    {
        innerOrbitRadiusKm: 33 * AU_KM,
        outerOrbitRadiusKm: 50 * AU_KM,
        minRadiusKm: 20,
        maxRadiusKm: 420,
        minMassKg: 1e14,
        maxMassKg: 2e19,
        numBodies: KUIPER_BELT_OBJECTS,
        colors: ['#c8d6df', '#9eb3c0', '#dfe8ec', '#8093a0'],
    },
];

export function createSolarSystem(engine: Engine): SolarSystem {
    const bodies: Body[] = [];
    const renderStyles = new Map<number, BodyRenderStyle>();
    const sun = createBody(SUN, BodyType.STAR);
    bodies.push(sun);
    renderStyles.set(sun.id, createRenderStyle(SUN, BodyType.STAR));

    for (const planetSpec of PLANETS) {
        const planet = createBody(planetSpec, BodyType.PLANET, sun);
        bodies.push(planet);
        renderStyles.set(planet.id, createRenderStyle(planetSpec, BodyType.PLANET));

        for (const moonSpec of planetSpec.moons ?? []) {
            const moon = createBody(moonSpec, BodyType.MOON, planet);
            bodies.push(moon);
            renderStyles.set(moon.id, createRenderStyle(moonSpec, BodyType.MOON));
        }
    }

    for (const beltSpec of BELTS) {
        bodies.push(...createBelt(sun, beltSpec, renderStyles));
    }

    for (const body of bodies) {
        engine.addBody(body);
    }

    return { bodies, renderStyles };
}

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

export function createImaginaryTripleStarSystem(engine: Engine): SolarSystem {
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

    for (const body of bodies) {
        engine.addBody(body);
    }

    return { bodies, renderStyles };
}

function createBody(spec: CelestialBodySpec, bodyType: BodyType, parent: Body | null = null): Body {
    const position = parent
        ? parent.position.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0))
        : getOrbitPosition(0, 0);

    const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, bodyType);
    body.parent = parent;

    if (parent) {
        body.velocity = parent.velocity.addNew(getOrbitalSpeed(parent, body, G));
    }

    return body;
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

function createBarycentricOrbitBody(
    spec: CelestialBodySpec,
    bodyType: BodyType,
    centralMassKg: number,
): Body {
    const position = getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0);
    const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, bodyType);
    const orbitRadiusKm = position.magnitude();

    if (orbitRadiusKm > 0) {
        const orbitalSpeedKmS = Math.sqrt((G * (centralMassKg + body.mass)) / orbitRadiusKm);
        body.velocity = position.unitVector().perpNew().scaleNew(orbitalSpeedKmS);
    }

    return body;
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

function createBelt(sun: Body, spec: BeltSpec, renderStyles: Map<number, BodyRenderStyle>): Body[] {
    const bodies: Body[] = [];

    for (let i = 0; i < spec.numBodies; i++) {
        const position = getOrbitPosition(
            randomNumber(spec.innerOrbitRadiusKm, spec.outerOrbitRadiusKm),
            randomNumber(0, 360),
        );
        const asteroid = new Body(
            position.x,
            position.y,
            randomNumber(spec.minRadiusKm, spec.maxRadiusKm),
            randomNumber(spec.minMassKg, spec.maxMassKg),
            BodyType.ASTEROID,
        );

        const fillColor = spec.colors[Math.floor(randomNumber(0, spec.colors.length))];

        asteroid.velocity = getOrbitalSpeed(sun, asteroid, G);
        renderStyles.set(asteroid.id, {
            ...DEFAULT_BODY_RENDER_STYLE,
            fillColor,
        });
        bodies.push(asteroid);
    }

    return bodies;
}

function createRenderStyle(spec: CelestialBodySpec, bodyType: BodyType): BodyRenderStyle {
    return {
        fillColor: spec.color,
        texture: spec.texture ? AssetStore.getTexture(spec.texture) : null,
        label: spec.name,
        labelColor: spec.labelColor ?? getDefaultLabelColor(spec, bodyType),
        labelFontSize: spec.labelFontSize ?? getLabelFontSize(spec, bodyType),
    };
}

function getDefaultLabelColor(spec: CelestialBodySpec, bodyType: BodyType): string {
    if (bodyType === BodyType.MOON) {
        return 'rgba(255, 255, 255, 0.78)';
    }

    return spec.color;
}

function getLabelFontSize(spec: CelestialBodySpec, bodyType: BodyType): number {
    if (bodyType === BodyType.STAR) {
        return 20;
    }

    if (bodyType === BodyType.MOON) {
        return 8;
    }

    return Math.round(clamp(10 + Math.sqrt(spec.radiusKm / EARTH_RADIUS_KM) * 2, 11, 17));
}
