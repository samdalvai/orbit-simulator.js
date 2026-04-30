import { TEXTURES } from '../AssetStore';
import { Body } from '../Body';
import { BodyRenderStyle } from '../BodyRenderStyle';

type TextureName = keyof typeof TEXTURES;

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

export type SolarSystem = {
    bodies: Body[];
    renderStyles: Map<number, BodyRenderStyle>;
};
