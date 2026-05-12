import { TextureName } from '../AssetStore';
import { Body, BodyType } from '../Body';
import { BodyRenderStyle } from '../BodyRenderStyle';
import { AU_KM, EARTH_RADIUS_KM } from '../Constants';
import { randomNumber } from '../Math';
import { Engine } from '../PackedEngine';
import { assert } from '../Utils';
import { Vec2 } from '../Vec2';
import { createBody, createRenderStyle } from './BodyGeneration';
import { CelestialBodySpec } from './BodySpec';

export type RandomSolarSystemProbabilities = {
    starCount?: [number, number, number];
    planetCount?: [number, number, number, number, number, number, number, number, number, number];
    moonCount?: [number, number, number, number, number, number];
};

export type RandomSolarSystemConfig = {
    probabilities?: RandomSolarSystemProbabilities;
    positionKm?: Vec2;
    velocityKmS?: Vec2;
};

export const DEFAULT_RANDOM_SOLAR_SYSTEM_PROBABILITIES: Required<RandomSolarSystemProbabilities> = {
    starCount: [0.82, 0.14, 0.04],
    planetCount: [0.08, 0.1, 0.12, 0.14, 0.14, 0.12, 0.1, 0.08, 0.07, 0.05],
    moonCount: [0.62, 0.18, 0.1, 0.06, 0.03, 0.01],
};

const STAR_TEXTURES: TextureName[] = ['planetSun', 'alphaCentauriA', 'alphaCentauriB', 'proximaCentauri', 'blueStar'];
const PLANET_TEXTURES: TextureName[] = [
    'planetMercury',
    'planetVenus',
    'planetEarth',
    'planetMars',
    'planetJupiter',
    'planetSaturn',
    'planetUranus',
    'planetNeptune',
    'proximaCentauriB',
    'proximaCentauriD',
];
const MOON_TEXTURES: TextureName[] = [
    'moonLuna',
    'moonPhobos',
    'moonDeimos',
    'moonIo',
    'moonEuropa',
    'moonGanymede',
    'moonCallisto',
    'moonTitan',
    'moonEnceladus',
    'moonRhea',
    'moonIapetus',
    'moonMiranda',
    'moonAriel',
    'moonUmbriel',
    'moonTitania',
    'moonOberon',
    'moonTriton',
];

const STAR_COLORS = ['#fff7b2', '#fff6bf', '#ffd28a', '#ff6f5e', '#9fc8ff'];
const PLANET_COLORS = ['#b7ada5', '#d8b16f', '#4a9fe8', '#c76245', '#d1a06f', '#d7c28b', '#9fe1df', '#5279e8'];
const MOON_COLORS = ['#b8b8b1', '#8f7a69', '#d7cab6', '#9a8b7a', '#d0b48a', '#a8a097', '#d6e0dd'];
const NAME_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function createRandomSolarSystem(engine: Engine, config: RandomSolarSystemConfig = {}) {
    const bodies: Body[] = [];
    const renderStyles = new Map<number, BodyRenderStyle>();
    const starCount =
        weightedCount(config.probabilities?.starCount ?? DEFAULT_RANDOM_SOLAR_SYSTEM_PROBABILITIES.starCount) + 1;
    const planetCount =
        weightedCount(config.probabilities?.planetCount ?? DEFAULT_RANDOM_SOLAR_SYSTEM_PROBABILITIES.planetCount) + 1;
    const randomStarColor = Math.floor(randomNumber(0, STAR_COLORS.length));
    assert(STAR_COLORS.length === STAR_TEXTURES.length);
    const primaryStarSpec: CelestialBodySpec = {
        name: randomName(),
        radiusKm: randomNumber(120_000, 1_060_000),
        massKg: randomNumber(8e29, 40e30),
        color: STAR_COLORS[randomStarColor],
        labelFontSize: 20,
        texture: STAR_TEXTURES[randomStarColor],
    };
    const primaryStar = createBody(primaryStarSpec, BodyType.STAR);

    bodies.push(primaryStar);
    renderStyles.set(primaryStar.id, createRenderStyle(primaryStarSpec, BodyType.STAR));

    for (let i = 1; i < starCount; i++) {
        const starSpec: CelestialBodySpec = {
            name: randomName(),
            radiusKm: randomNumber(110_000, 620_000),
            massKg: randomNumber(2e29, 1.5e30),
            orbitRadiusKm: randomNumber(0.15, 0.55) * AU_KM,
            orbitAngleDegrees: randomNumber(0, 360),
            color: STAR_COLORS[Math.floor(randomNumber(0, STAR_COLORS.length))],
            labelFontSize: 18,
            texture: STAR_TEXTURES[Math.floor(randomNumber(0, STAR_TEXTURES.length))],
        };
        const star = createBody(starSpec, BodyType.STAR, primaryStar);

        bodies.push(star);
        renderStyles.set(star.id, createRenderStyle(starSpec, BodyType.STAR));
    }

    let planetOrbitRadiusKm = randomNumber(0.45, 0.9) * AU_KM;

    for (let i = 0; i < planetCount; i++) {
        const radiusKm = randomNumber(2_000, 70_000);
        const densityFactor = radiusKm > 20_000 ? randomNumber(0.05, 0.25) : randomNumber(0.4, 1.6);
        const planetSpec: CelestialBodySpec = {
            name: randomName(),
            radiusKm,
            massKg: 5.972e24 * Math.pow(radiusKm / EARTH_RADIUS_KM, 3) * densityFactor,
            orbitRadiusKm: planetOrbitRadiusKm,
            orbitAngleDegrees: randomNumber(0, 360),
            color: PLANET_COLORS[Math.floor(randomNumber(0, PLANET_COLORS.length))],
            texture: PLANET_TEXTURES[Math.floor(randomNumber(0, PLANET_TEXTURES.length))],
        };
        const planet = createBody(planetSpec, BodyType.PLANET, primaryStar);

        bodies.push(planet);
        renderStyles.set(planet.id, createRenderStyle(planetSpec, BodyType.PLANET));

        let moonOrbitRadiusKm = Math.max(80_000, radiusKm * randomNumber(8, 18));
        const moonCount = weightedCount(
            config.probabilities?.moonCount ?? DEFAULT_RANDOM_SOLAR_SYSTEM_PROBABILITIES.moonCount,
        );

        for (let j = 0; j < moonCount; j++) {
            const moonRadiusKm = randomNumber(90, Math.min(2_900, radiusKm * 0.45));
            const moonSpec: CelestialBodySpec = {
                name: randomName(),
                radiusKm: moonRadiusKm,
                massKg: 7.342e22 * Math.pow(moonRadiusKm / 1_737.4, 3) * randomNumber(0.35, 1.4),
                orbitRadiusKm: moonOrbitRadiusKm,
                orbitAngleDegrees: randomNumber(0, 360),
                color: MOON_COLORS[Math.floor(randomNumber(0, MOON_COLORS.length))],
                texture: MOON_TEXTURES[Math.floor(randomNumber(0, MOON_TEXTURES.length))],
            };
            const moon = createBody(moonSpec, BodyType.MOON, planet);

            bodies.push(moon);
            renderStyles.set(moon.id, createRenderStyle(moonSpec, BodyType.MOON));
            moonOrbitRadiusKm += Math.max(40_000, radiusKm * randomNumber(4, 12));
        }

        planetOrbitRadiusKm += randomNumber(0.35, 0.9) * AU_KM;
    }

    for (const body of bodies) {
        if (config.positionKm) {
            body.position.addAssign(config.positionKm);
            body.updateAABB();
        }

        if (config.velocityKmS) {
            body.velocity.addAssign(config.velocityKmS);
        }

        engine.addBody(body);
    }

    return { bodies, renderStyles };
}

function weightedCount(probabilities: number[]): number {
    const total = probabilities.reduce((sum, probability) => sum + probability, 0);
    let roll = randomNumber(0, total);

    for (let i = 0; i < probabilities.length; i++) {
        roll -= probabilities[i];

        if (roll <= 0) {
            return i;
        }
    }

    return probabilities.length - 1;
}

function randomName(): string {
    const length = Math.floor(randomNumber(4, 8));
    let name = '';

    for (let i = 0; i < length; i++) {
        name += NAME_CHARACTERS[Math.floor(randomNumber(0, NAME_CHARACTERS.length))];
    }

    return name;
}
