import { BodiesFactory, GRAVITY, SETTINGS, Utils, Vec2 } from '../../src';
import type { RigidBody, World } from '../../src';
import { ContactInfo } from '../../src/collision/ContactManifold';
import type Application from '../Application';
import Graphics from '../graphics/Graphics';
import { defineDemo } from './shared';

const AU_IN_KM = 149_597_870.7;
const EARTH_RADIUS_KM = 6_371;
const EARTH_ORBIT_PIXELS = 700;
const EARTH_READABLE_RADIUS_PIXELS = 10;
const USE_PLANET_TEXTURES = true;
const ADD_ASTEROID_BELT = true;
const ADD_KUIPER_BELT = true;

/**
 * 0 = compressed, readable demo scale.
 * 1 = real relative orbit distances and physical radii in the same pixel scale.
 *
 * At 1, planets are physically correct but become sub-pixel dots. Values around
 * 0.25-0.45 keep the system pleasant to watch while preserving the real order
 * and relative differences.
 */
const SOLAR_SYSTEM_SCALE_REALISM = 0.25;

const COMPRESSED_ORBIT_EXPONENT = 0.62;
const COMPRESSED_RADIUS_EXPONENT = 0.55;
const MIN_READABLE_RADIUS_PIXELS = 3;
const MASS_SCALE = 1;
const PLANET_EXPLOSION_THRESHOLD = 750;

type CelestialBodySpec = {
    name: string;
    radiusKm: number;
    massEarths: number;
    color: string;
    texture?: TextureName;
    orbitAu?: number;
    orbitAngleDegrees?: number;
};

type TextureName = Parameters<Application['setBodyTexture']>[1];

const SUN: CelestialBodySpec = {
    name: 'Sun',
    radiusKm: 695_700,
    massEarths: 332_946,
    color: '#fff7b2',
    texture: 'planetSun',
};

const PLANETS: CelestialBodySpec[] = [
    {
        name: 'Mercury',
        radiusKm: 2_439.7,
        massEarths: 0.0553,
        orbitAu: 0.3871,
        orbitAngleDegrees: 15,
        color: '#b7ada5',
        texture: 'planetMercury',
    },
    {
        name: 'Venus',
        radiusKm: 6_051.8,
        massEarths: 0.815,
        orbitAu: 0.7233,
        orbitAngleDegrees: 105,
        color: '#d8b16f',
        texture: 'planetVenus',
    },
    {
        name: 'Earth',
        radiusKm: 6_371,
        massEarths: 1,
        orbitAu: 1,
        orbitAngleDegrees: 190,
        color: '#4a9fe8',
        texture: 'planetEarth',
    },
    {
        name: 'Mars',
        radiusKm: 3_389.5,
        massEarths: 0.107,
        orbitAu: 1.5237,
        orbitAngleDegrees: 280,
        color: '#c76245',
        texture: 'planetMars',
    },
    {
        name: 'Jupiter',
        radiusKm: 69_911,
        massEarths: 317.83,
        orbitAu: 5.2044,
        orbitAngleDegrees: 335,
        color: '#d1a06f',
        texture: 'planetJupiter',
    },
    {
        name: 'Saturn',
        radiusKm: 58_232,
        massEarths: 95.16,
        orbitAu: 9.5826,
        orbitAngleDegrees: 55,
        color: '#d7c28b',
        texture: 'planetSaturn',
    },
    {
        name: 'Uranus',
        radiusKm: 25_362,
        massEarths: 14.54,
        orbitAu: 19.2184,
        orbitAngleDegrees: 145,
        color: '#9fe1df',
        texture: 'planetUranus',
    },
    {
        name: 'Neptune',
        radiusKm: 24_622,
        massEarths: 17.15,
        orbitAu: 30.11,
        orbitAngleDegrees: 245,
        color: '#5279e8',
        texture: 'planetNeptune',
    },
];

function setupPlanetOrbit(world: World, app: Application): void {
    app.setBackground('transparent');
    Graphics.zoom = 0.055;

    SETTINGS.applyGravity = false;

    const sun = createBody(SUN, new Vec2(0, 0));
    sun.onContact = info => {
        onContactCallBack(sun, SUN, info, world, app);
    };
    world.addBody(sun);
    applyBodyStyle(app, sun, SUN);
    app.setBodyLabel(sun, SUN.name, 15, '#fff7b2');

    for (const planetSpec of PLANETS) {
        const position = getOrbitPosition(planetSpec);
        const planet = createBody(planetSpec, position);
        planet.velocity = getOrbitalSpeed(sun, planet, GRAVITY);

        planet.onContact = info => {
            onContactCallBack(planet, planetSpec, info, world, app);
        };

        world.addBody(planet);
        applyBodyStyle(app, planet, planetSpec);
        app.setBodyLabel(planet, planetSpec.name, 13, planetSpec.color);
    }

    if (ADD_ASTEROID_BELT) {
        const mars = PLANETS.find(planet => planet.name === 'Mars')!;
        const jupiter = PLANETS.find(planet => planet.name === 'Jupiter')!;

        const marsOrbit = mars.orbitAu!;
        const jupiterOrbit = jupiter.orbitAu!;
        const orbitGap = jupiterOrbit - marsOrbit;
        const innerDistance = getScaledOrbitDistance(marsOrbit + orbitGap * 0.18);
        const outerDistance = getScaledOrbitDistance(marsOrbit + orbitGap * 0.46);
        const marsRadius = getScaledRadius(mars.radiusKm);
        const jupiterRadius = getScaledRadius(jupiter.radiusKm);
        const minRadius = Math.max(1.5, marsRadius * 0.2);
        const maxRadius = Math.max(minRadius + 0.5, marsRadius * 0.35 + jupiterRadius * 0.02);
        const marsMass = mars.massEarths * MASS_SCALE;
        const minMass = Math.max(0.001, marsMass * 0.01);
        const maxMass = Math.max(minMass * 2, marsMass * 0.05);

        createBelt(world, app, sun, {
            innerDistance,
            outerDistance,
            minRadius,
            maxRadius,
            minMass,
            maxMass,
            numBodies: 120,
            colors: ['darkbrown'],
        });
    }

    if (ADD_KUIPER_BELT) {
        const neptune = PLANETS.find(planet => planet.name === 'Neptune')!;

        const neptuneOrbit = neptune.orbitAu!;
        const kuiperOuterOrbit = 50;
        const orbitGap = kuiperOuterOrbit - neptuneOrbit;
        const innerDistance = getScaledOrbitDistance(neptuneOrbit + orbitGap * 0.12);
        const outerDistance = getScaledOrbitDistance(neptuneOrbit + orbitGap * 0.92);
        const neptuneRadius = getScaledRadius(neptune.radiusKm);
        const minRadius = Math.max(1.5, neptuneRadius * 0.12);
        const maxRadius = Math.max(minRadius + 0.5, neptuneRadius * 0.22);
        const neptuneMass = neptune.massEarths * MASS_SCALE;
        const minMass = Math.max(0.001, neptuneMass * 0.0005);
        const maxMass = Math.max(minMass * 2, neptuneMass * 0.003);

        createBelt(world, app, sun, {
            innerDistance,
            outerDistance,
            minRadius,
            maxRadius,
            minMass,
            maxMass,
            numBodies: 300,
            colors: ['#f7fbff', '#b8deff'],
        });
    }

    app.setGravitationalForce(true);
}

function onContactCallBack(
    planet: RigidBody,
    planetSpec: CelestialBodySpec,
    info: ContactInfo,
    world: World,
    app: Application,
) {
    const impactForce = info.impulseSum / SETTINGS.dt;
    const impactStrength = impactForce / Math.sqrt(planet.mass);

    if (impactStrength >= PLANET_EXPLOSION_THRESHOLD) {
        const radius = planetSpec.radiusKm;
        const numDebries = Math.floor(radius / 1000);
        const scaledPlanetRadius = getScaledRadius(planetSpec.radiusKm);
        const debriesRadius = EARTH_RADIUS_KM / 1000;
        const scaledDebriesRadius = getScaledRadius(debriesRadius);
        const mass = planet.mass / numDebries;

        for (let i = 0; i < numDebries; i++) {
            const vertices = Utils.randomNumber(3, 10);
            const color = planetSpec.color;
            const pos = randomPointInRadius(planet.position, Math.max(0, scaledPlanetRadius - scaledDebriesRadius));

            const debrie = Utils.randomConvexBody(pos.x, pos.y, scaledDebriesRadius, vertices, mass);
            debrie.velocity = planet.velocity.copy();
            const outwardDirection = debrie.position.subNew(planet.position);
            if (outwardDirection.magnitudeSquared() === 0) {
                const angle = Utils.randomNumber(0, Math.PI * 2);
                outwardDirection.x = Math.cos(angle);
                outwardDirection.y = Math.sin(angle);
            } else {
                outwardDirection.normalize();
            }
            const outwardSpeed = scaledPlanetRadius * Utils.randomNumber(1, 10);
            debrie.applyImpulseLinear(outwardDirection.scaleNew(outwardSpeed * mass));
            app.setBodyFillColor(debrie, color);
            world.addBody(debrie);
        }

        planet.onContact = undefined;
        world.removeBody(planet);
    }
}

function applyBodyStyle(app: Application, body: RigidBody, spec: CelestialBodySpec): void {
    if (USE_PLANET_TEXTURES && spec.texture) {
        app.setBodyTexture(body, spec.texture);
        app.setBodyTextureScale(body, 1.2);
        return;
    }

    app.setBodyFillColor(body, spec.color);
}

function createBody(spec: CelestialBodySpec, position: Vec2): RigidBody {
    return BodiesFactory.circle({
        radius: getScaledRadius(spec.radiusKm),
        x: position.x,
        y: position.y,
        mass: spec.massEarths * MASS_SCALE,
        friction: 0,
        restitution: 0,
    });
}

function getOrbitPosition(spec: CelestialBodySpec): Vec2 {
    const orbitAu = spec.orbitAu ?? 0;
    const orbitAngleDegrees = spec.orbitAngleDegrees ?? 0;
    const distance = getScaledOrbitDistance(orbitAu);
    const angle = degreesToRadians(orbitAngleDegrees);

    return new Vec2(Math.cos(angle) * distance, Math.sin(angle) * distance);
}

function getScaledOrbitDistance(orbitAu: number): number {
    const compressedDistance = EARTH_ORBIT_PIXELS * Math.pow(orbitAu, COMPRESSED_ORBIT_EXPONENT);
    const realDistance = EARTH_ORBIT_PIXELS * orbitAu;

    return lerp(compressedDistance, realDistance, SOLAR_SYSTEM_SCALE_REALISM);
}

function getScaledRadius(radiusKm: number): number {
    const radiusEarths = radiusKm / EARTH_RADIUS_KM;
    const readableRadius = EARTH_READABLE_RADIUS_PIXELS * Math.pow(radiusEarths, COMPRESSED_RADIUS_EXPONENT);
    const realRadius = radiusKm * (EARTH_ORBIT_PIXELS / AU_IN_KM);
    const shrinkingMinimumRadius = MIN_READABLE_RADIUS_PIXELS * (1 - SOLAR_SYSTEM_SCALE_REALISM);

    return Math.max(shrinkingMinimumRadius, lerp(readableRadius, realRadius, SOLAR_SYSTEM_SCALE_REALISM));
}

function lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
}

function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function randomPointInRadius(center: Vec2, radius: number): Vec2 {
    const u = Math.random();
    const v = Math.random();

    const r = radius * Math.sqrt(u);
    const theta = 2 * Math.PI * v;

    return new Vec2(center.x + Math.cos(theta) * r, center.y + Math.sin(theta) * r);
}

function createBelt(
    world: World,
    app: Application,
    sun: RigidBody,
    config: {
        innerDistance: number;
        outerDistance: number;
        minRadius: number;
        maxRadius: number;
        minMass: number;
        maxMass: number;
        numBodies: number;
        colors: string[];
    },
): void {
    for (let i = 0; i < config.numBodies; i++) {
        const orbitAngleDegrees = Utils.randomNumber(0, 360);
        const orbitAnglesRadians = degreesToRadians(orbitAngleDegrees);
        const distributedDist = Utils.randomNumber(config.innerDistance, config.outerDistance);
        const pos = new Vec2(
            Math.cos(orbitAnglesRadians) * distributedDist,
            Math.sin(orbitAnglesRadians) * distributedDist,
        );
        const numVertices = Utils.randomNumber(3, 10);
        const radius = Utils.randomNumber(config.minRadius, config.maxRadius);
        const mass = Utils.randomNumber(config.minMass, config.maxMass);
        const asteroid = Utils.randomConvexBody(pos.x, pos.y, radius, numVertices, mass);
        asteroid.velocity = getOrbitalSpeed(sun, asteroid, GRAVITY);
        app.setBodyFillColor(asteroid, config.colors[Math.floor(Math.random() * config.colors.length)]);
        world.addBody(asteroid);
    }
}

/**
 * Computes the tangential velocity for a circular orbit of `planet` around `sun`.
 *
 * Uses: v = sqrt(G * (M + m) / r)
 * - M = sun mass
 * - m = planet mass
 * - r = distance between bodies
 *
 * The returned vector is perpendicular to the radius (tangential direction).
 */
function getOrbitalSpeed(sun: RigidBody, planet: RigidBody, G: number): Vec2 {
    const rVec = planet.position.subNew(sun.position);
    const r = rVec.magnitude();
    const v = Math.sqrt((G * (sun.mass + planet.mass)) / r);
    const dir = planet.position.subNew(sun.position).unitVector();
    const tangent = new Vec2(-dir.y, dir.x);

    return tangent.scaleNew(v);
}

const planetOrbitDemo = defineDemo('Solar system orbit', setupPlanetOrbit);

export default planetOrbitDemo;
