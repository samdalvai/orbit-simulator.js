import { TextureName } from '../view/AssetStore';

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
    /** Distance from the parent body to place this body at creation time. */
    orbitRadiusKm?: number;
    /**
     * Starting angle around the parent body, in degrees.
     *
     * This chooses where on the orbit the body starts, changing it only changes 
     * the initial position/phase.
     */
    orbitAngleDegrees?: number;
    /**
     * Inclination of the orbit plane, in degrees.
     *
     * `0` means a flat orbit in the X/Y plane. `180` is still the same X/Y
     * plane, but the orbit normal is flipped, so the body moves in the opposite
     * direction: a retrograde orbit. Values between those, such as `45`, tilt
     * the orbit out of the X/Y plane.
     */
    orbitTiltDegrees?: number;
} & CelestialBodySpecBase;

export type PlanetBodySpec = {
    moons?: CelestialBodySpec[];
} & CelestialBodySpec;

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
