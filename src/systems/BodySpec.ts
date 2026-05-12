import { TextureName } from '../AssetStore';

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
