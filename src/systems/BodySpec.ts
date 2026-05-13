import { TextureName } from '../AssetStore';

// TODO: update to support multiple stars orbiting iaround baricentric point
export type SolarSystemSpec = {
    mainStar: CelestialBodySpecBase;
    secondaryStars: CelestialBodySpec[];
    planets: PlanetBodySpec[];
    belts: BeltSpec[];
};

export type CelestialBodySpecBase = {
    name: string;
    radiusKm: number;
    massKg: number;
    color: string;
    labelColor?: string;
    labelFontSize?: number;
    texture?: TextureName;
};

export type CelestialBodySpec = {
    orbitRadiusKm?: number;
    orbitAngleDegrees?: number;
} & CelestialBodySpecBase;

export type PlanetBodySpec = {
    moons?: CelestialBodySpec[];
} & CelestialBodySpec;

export type CelestialBodySpecDeprecated = {
    name: string;
    radiusKm: number;
    massKg: number;
    color: string;
    labelColor?: string;
    labelFontSize?: number;
    texture?: TextureName;
    orbitRadiusKm?: number;
    orbitAngleDegrees?: number;
    moons?: CelestialBodySpecDeprecated[];
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
