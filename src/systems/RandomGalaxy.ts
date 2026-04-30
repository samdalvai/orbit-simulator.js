import AssetStore from '../AssetStore';
import { Body, BodyType } from '../Body';
import { BodyRenderStyle } from '../BodyRenderStyle';
import { AU_KM, G } from '../Constants';
import { Engine } from '../Engine';
import { getOrbitPosition, randomNumber } from '../Math';
import { SolarSystem } from './BodySpec';
import { createRandomSolarSystem } from './RandomSolarSystem';

const SOLAR_SYSTEM_COUNT = 400;
const SUPERMASSIVE_BLACK_HOLE_RADIUS_KM = 80_000_000;
const SUPERMASSIVE_BLACK_HOLE_MASS_KG = 8e32;
const GALAXY_INNER_ORBIT_RADIUS_AU = 25;
const GALAXY_OUTER_ORBIT_RADIUS_AU = 120;

export function createRandomGalaxy(engine: Engine): SolarSystem {
    const bodies: Body[] = [];
    const renderStyles = new Map<number, BodyRenderStyle>();
    const blackHole = new Body(
        0,
        0,
        SUPERMASSIVE_BLACK_HOLE_RADIUS_KM,
        SUPERMASSIVE_BLACK_HOLE_MASS_KG,
        BodyType.STAR,
    );

    bodies.push(blackHole);
    renderStyles.set(blackHole.id, {
        fillColor: '#030009',
        texture: AssetStore.getTexture('blackHole'),
        label: 'SMBH',
        labelColor: '#d9b8ff',
        labelFontSize: 22,
    });
    engine.addBody(blackHole);

    for (let i = 0; i < SOLAR_SYSTEM_COUNT; i++) {
        const orbitRadiusKm = randomNumber(GALAXY_INNER_ORBIT_RADIUS_AU, GALAXY_OUTER_ORBIT_RADIUS_AU) * AU_KM;
        const positionKm = getOrbitPosition(orbitRadiusKm, randomNumber(0, 360));
        const speedKmS = Math.sqrt((G * blackHole.mass) / orbitRadiusKm);
        const velocityKmS = positionKm.unitVector().perpNew().scaleNew(speedKmS);
        const solarSystem = createRandomSolarSystem(engine, { positionKm, velocityKmS });

        bodies.push(...solarSystem.bodies);

        for (const [bodyId, renderStyle] of solarSystem.renderStyles) {
            renderStyles.set(bodyId, renderStyle);
        }
    }

    return { bodies, renderStyles };
}
