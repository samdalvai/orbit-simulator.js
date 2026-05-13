import { TextureName } from '../AssetStore';

// TODO: update to support multiple stars orbiting iaround baricentric point
export type SolarSystemSpec = {
    star: {
        name: string;
        radiusKm: number;
        massKg: number;
        color: string;
        texture?: TextureName;
    };
    bodies: CelestialBodySpec[];
    belts: BeltSpec[];
};

export type CelestialBodySpec = {
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

export type BeltSpec = {
    innerOrbitRadiusKm: number;
    outerOrbitRadiusKm: number;
    minRadiusKm: number;
    maxRadiusKm: number;
    minMassKg: number;
    maxMassKg: number;
    numBodies: number;
    colors: string[];
};
