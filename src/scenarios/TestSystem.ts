import { SolarSystemSpec } from './BodySpec';

export const testSystem: SolarSystemSpec = {
    mainStar: {
        name: 'Sun',
        radiusKm: 695_700,
        massKg: 1.98847e30,
        color: '#fff7b2',
        texture: 'planetSun',
    },
    secondaryStars: [
        // {
        //     name: 'Vesper',
        //     radiusKm: 695_700,
        //     massKg: 1.98847e30,
        //     orbitRadiusKm: 695_700 * 2,
        //     orbitAngleDegrees: 0,
        //     color: '#ffb45f',
        //     labelFontSize: 18,
        //     texture: 'planetSun',
        // },
    ],
    planets: [],
    belts: [],
};
