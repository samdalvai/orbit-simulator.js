import { Body, BodyType } from './Body';
import { G, PIXELS_PER_KM } from './Constants';
import { Engine } from './Engine';
import { getOrbitPosition, getOrbitalSpeed } from './Math';

export function createSolarSystem(engine: Engine): Body[] {
    const SUN_MASS = 1.98847e30; // kg
    const SUN_RADIUS_KM = 695_700; // km

    const sun = new Body(0, 0, SUN_RADIUS_KM, SUN_MASS, BodyType.STAR);
    sun.fillColor = '#fff7b2';
    sun.label = 'Sun';
    sun.texture = 'planetSun';

    const MERCURY_MASS = 3.3011e23; // kg
    const MERCURY_RADIUS_KM = 2_439.7; // km
    const MERCURY_ORBIT_RADIUS_KM = 57_909_227; // km (0.387 AU)

    const mercuryPos = getOrbitPosition(MERCURY_ORBIT_RADIUS_KM, 15);
    const mercury = new Body(mercuryPos.x, mercuryPos.y, MERCURY_RADIUS_KM, MERCURY_MASS, BodyType.PLANET);
    mercury.fillColor = '#b7ada5';
    mercury.velocity = getOrbitalSpeed(sun, mercury, G);
    mercury.label = 'Mercury';
    mercury.texture = 'planetMercury';

    const VENUS_MASS = 4.8675e24; // kg
    const VENUS_RADIUS_KM = 6_051.8; // km
    const VENUS_ORBIT_RADIUS_KM = 108_209_475; // km (0.723 AU)

    const venusPos = getOrbitPosition(VENUS_ORBIT_RADIUS_KM, 105);
    const venus = new Body(venusPos.x, venusPos.y, VENUS_RADIUS_KM, VENUS_MASS, BodyType.PLANET);
    venus.fillColor = '#d8b16f';
    venus.velocity = getOrbitalSpeed(sun, venus, G);
    venus.label = 'Venus';
    venus.texture = 'planetVenus';

    const EARTH_MASS = 5.972e24; // kg
    const EARTH_RADIUS_KM = 6_371; // km
    const EARTH_ORBIT_RADIUS_KM = 149_597_870.7; // 1 AU

    console.log('PIXELS_PER_KM: ', PIXELS_PER_KM);
    console.log('orbit: ', PIXELS_PER_KM * EARTH_ORBIT_RADIUS_KM);
    console.log('radius: ', PIXELS_PER_KM * EARTH_RADIUS_KM);

    const earthPos = getOrbitPosition(EARTH_ORBIT_RADIUS_KM, 190);
    const earth = new Body(earthPos.x, earthPos.y, EARTH_RADIUS_KM, EARTH_MASS, BodyType.PLANET);
    earth.fillColor = '#4a9fe8';
    earth.velocity = getOrbitalSpeed(sun, earth, G);
    earth.label = 'Earth';
    earth.texture = 'planetEarth';

    const MOON_MASS = 7.342e22; // kg
    const MOON_RADIUS_KM = 1_737.4; // km
    const MOON_DISTANCE_KM = 384_400; // km (average distance to Earth)

    const moonOffset = getOrbitPosition(MOON_DISTANCE_KM, 250);
    const moonPos = earth.position.addNew(moonOffset);
    const moon = new Body(moonPos.x, moonPos.y, MOON_RADIUS_KM, MOON_MASS, BodyType.MOON);
    moon.parent = earth;
    moon.fillColor = 'gray';
    moon.velocity = earth.velocity.addNew(getOrbitalSpeed(earth, moon, G));
    moon.label = 'Moon';

    const MARS_MASS = 6.4171e23; // kg
    const MARS_RADIUS_KM = 3_389.5; // km
    const MARS_ORBIT_RADIUS_KM = 227_943_824; // km (1.524 AU)

    const marsPos = getOrbitPosition(MARS_ORBIT_RADIUS_KM, 280);
    const mars = new Body(marsPos.x, marsPos.y, MARS_RADIUS_KM, MARS_MASS, BodyType.PLANET);
    mars.fillColor = '#c76245';
    mars.velocity = getOrbitalSpeed(sun, mars, G);
    mars.label = 'Mars';
    mars.texture = 'planetMars';

    const JUPITER_MASS = 1.8982e27; // kg
    const JUPITER_RADIUS_KM = 69_911; // km
    const JUPITER_ORBIT_RADIUS_KM = 778_340_821; // km (5.203 AU)

    const jupiterPos = getOrbitPosition(JUPITER_ORBIT_RADIUS_KM, 335);
    const jupiter = new Body(jupiterPos.x, jupiterPos.y, JUPITER_RADIUS_KM, JUPITER_MASS, BodyType.PLANET);
    jupiter.fillColor = '#d1a06f';
    jupiter.velocity = getOrbitalSpeed(sun, jupiter, G);
    jupiter.label = 'Jupiter';
    jupiter.texture = 'planetJupiter';

    const SATURN_MASS = 5.6834e26; // kg
    const SATURN_RADIUS_KM = 58_232; // km
    const SATURN_ORBIT_RADIUS_KM = 1_426_666_422; // km (9.537 AU)

    const saturnPos = getOrbitPosition(SATURN_ORBIT_RADIUS_KM, 55);
    const saturn = new Body(saturnPos.x, saturnPos.y, SATURN_RADIUS_KM, SATURN_MASS, BodyType.PLANET);
    saturn.fillColor = '#d7c28b';
    saturn.velocity = getOrbitalSpeed(sun, saturn, G);
    saturn.label = 'Saturn';
    saturn.texture = 'planetSaturn';

    const URANUS_MASS = 8.681e25; // kg
    const URANUS_RADIUS_KM = 25_362; // km
    const URANUS_ORBIT_RADIUS_KM = 2_870_658_186; // km (19.191 AU)

    const uranusPos = getOrbitPosition(URANUS_ORBIT_RADIUS_KM, 145);
    const uranus = new Body(uranusPos.x, uranusPos.y, URANUS_RADIUS_KM, URANUS_MASS, BodyType.PLANET);
    uranus.fillColor = '#9fe1df';
    uranus.velocity = getOrbitalSpeed(sun, uranus, G);
    uranus.label = 'Uranus';
    uranus.texture = 'planetUranus';

    const NEPTUNE_MASS = 1.02413e26; // kg
    const NEPTUNE_RADIUS_KM = 24_622; // km
    const NEPTUNE_ORBIT_RADIUS_KM = 4_498_396_441; // km (30.07 AU)

    const neptunePos = getOrbitPosition(NEPTUNE_ORBIT_RADIUS_KM, 245);
    const neptune = new Body(neptunePos.x, neptunePos.y, NEPTUNE_RADIUS_KM, NEPTUNE_MASS, BodyType.PLANET);
    neptune.fillColor = '#5279e8';
    neptune.velocity = getOrbitalSpeed(sun, neptune, G);
    neptune.label = 'Neptune';
    neptune.texture = 'planetNeptune';

    const bodies = [sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, moon];

    for (const body of bodies) {
        engine.addBody(body);
    }

    return [sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, moon];
}
