import { BodyType, bodyIndexById, mass } from '../sim/Body';
import { BodyRenderStyle } from '../view/BodyRenderStyle';
import { AU_KM, G } from '../shared/Constants';
import { getOrbitPosition, randomNumber } from '../shared/Math';
import { CelestialBodySpecBase } from './BodySpec';
import { createRandomSolarSystem } from './RandomSolarSystem';
import { createBody, createRenderStyle, createSolarSystem } from './BodyGeneration';

const SOLAR_SYSTEM_COUNT = 500;
const SUPERMASSIVE_BLACK_HOLE_RADIUS_KM = 80_000_000;
const SUPERMASSIVE_BLACK_HOLE_MASS_KG = 8e32;
const GALAXY_INNER_ORBIT_RADIUS_AU = 25;
const GALAXY_OUTER_ORBIT_RADIUS_AU = 10_000;

const blackHoleSpec: CelestialBodySpecBase = {
    name: 'SMBH',
    radiusKm: SUPERMASSIVE_BLACK_HOLE_RADIUS_KM,
    massKg: SUPERMASSIVE_BLACK_HOLE_MASS_KG,
    color: '#030009',
    texture: 'blackHole',
    labelColor: '#d9b8ff',
    labelFontSize: 22,
};

export function createRandomGalaxy(renderStyles: Map<number, BodyRenderStyle>) {
    const blackHoleId = createBody(blackHoleSpec, BodyType.STAR);
    const blackHoleIndex = bodyIndexById[blackHoleId];
    const blackHoleMass = mass[blackHoleIndex];
    renderStyles.set(blackHoleId, createRenderStyle(blackHoleSpec, BodyType.STAR));

    for (let i = 0; i < SOLAR_SYSTEM_COUNT; i++) {
        const orbitRadiusKm = randomNumber(GALAXY_INNER_ORBIT_RADIUS_AU, GALAXY_OUTER_ORBIT_RADIUS_AU) * AU_KM;
        const positionKm = getOrbitPosition(orbitRadiusKm, randomNumber(0, 360));
        const speedKmS = Math.sqrt((G * blackHoleMass) / orbitRadiusKm);
        const velocityKmS = positionKm.unitVector().perpNew().scaleNew(speedKmS);
        const solarSystemSpec = createRandomSolarSystem();
        createSolarSystem(solarSystemSpec, renderStyles, positionKm, velocityKmS);
    }
}
