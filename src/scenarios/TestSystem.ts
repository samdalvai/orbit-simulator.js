import { AU_KM } from '../shared/Constants';
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
        {
            name: 'Vesper',
            radiusKm: 420_000,
            massKg: 1.35e30,
            orbitRadiusKm: 0.2 * AU_KM,
            orbitAngleDegrees: 0,
            color: '#ffb45f',
            labelFontSize: 18,
            texture: 'alphaCentauriB',
        },
        {
            name: 'Sable',
            radiusKm: 500_000,
            massKg: 1.35e30,
            orbitRadiusKm: 0.4 * AU_KM,
            orbitAngleDegrees: 180,
            color: '#ff7059',
            labelFontSize: 18,
            texture: 'proximaCentauri',
        },
    ],
    planets: [],
    belts: [
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
    ],
};
