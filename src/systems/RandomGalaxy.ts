import { BodyRenderStyle } from '../BodyRenderStyle';
import { AU_KM, G } from '../Constants';
import { getOrbitPosition, randomNumber } from '../Math';
import { BodyType, bodyIndexById, mass } from '../Body';
import { CelestialBodySpecBase } from './BodySpec';
import { createPackedBody, createPackedSolarSystem, createRenderStyle } from './PackedBodyGeneration';
import { createRandomSolarSystem } from './RandomSolarSystem';

const SOLAR_SYSTEM_COUNT = 900;
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
    const blackHoleId = createPackedBody(blackHoleSpec, BodyType.STAR);
    const blackHoleIndex = bodyIndexById[blackHoleId];
    const blackHoleMass = mass[blackHoleIndex];
    renderStyles.set(blackHoleId, createRenderStyle(blackHoleSpec, BodyType.STAR));

    for (let i = 0; i < SOLAR_SYSTEM_COUNT; i++) {
        const orbitRadiusKm = randomNumber(GALAXY_INNER_ORBIT_RADIUS_AU, GALAXY_OUTER_ORBIT_RADIUS_AU) * AU_KM;
        const positionKm = getOrbitPosition(orbitRadiusKm, randomNumber(0, 360));
        const speedKmS = Math.sqrt((G * blackHoleMass) / orbitRadiusKm);
        const velocityKmS = positionKm.unitVector().perpNew().scaleNew(speedKmS);
        const solarSystemSpec = createRandomSolarSystem();
        createPackedSolarSystem(solarSystemSpec, renderStyles, positionKm, velocityKmS);
    }
}
