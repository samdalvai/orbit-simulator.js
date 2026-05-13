import AssetStore from '../AssetStore';
import { Body, BodyType } from '../Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from '../BodyRenderStyle';
import { EARTH_RADIUS_KM, G } from '../Constants';
import { clamp, getOrbitPosition, getOrbitalSpeed, getOrbitalSpeedByParent, randomNumber } from '../Math';
import { Vec2 } from '../Vec2';
import { BeltSpec, CelestialBodySpecDeprecated } from './BodySpec';


export function createBody(spec: CelestialBodySpecDeprecated, bodyType: BodyType, parent: Body | null = null): Body {
    const position = parent
        ? parent.position.addNew(getOrbitPosition(spec.orbitRadiusKm ?? 0, spec.orbitAngleDegrees ?? 0))
        : getOrbitPosition(0, 0);

    const body = new Body(position.x, position.y, spec.radiusKm, spec.massKg, bodyType);
    body.parent = parent;

    if (parent) {
        body.velocity = parent.velocity.addNew(getOrbitalSpeedByParent(parent, body, G));
    }

    return body;
}

export function createBelt(
    centerPos: Vec2,
    centerMass: number,
    spec: BeltSpec,
    renderStyles: Map<number, BodyRenderStyle>,
): Body[] {
    const bodies: Body[] = [];

    for (let i = 0; i < spec.numBodies; i++) {
        const position = getOrbitPosition(
            randomNumber(spec.innerOrbitRadiusKm, spec.outerOrbitRadiusKm),
            randomNumber(0, 360),
        );
        const asteroid = new Body(
            position.x,
            position.y,
            randomNumber(spec.minRadiusKm, spec.maxRadiusKm),
            randomNumber(spec.minMassKg, spec.maxMassKg),
            BodyType.ASTEROID,
        );

        const fillColor = spec.colors[Math.floor(randomNumber(0, spec.colors.length))];

        asteroid.velocity = getOrbitalSpeed(centerPos, centerMass, asteroid, G);
        renderStyles.set(asteroid.id, {
            ...DEFAULT_BODY_RENDER_STYLE,
            fillColor,
        });
        bodies.push(asteroid);
    }

    return bodies;
}

export function createRenderStyle(spec: CelestialBodySpecDeprecated, bodyType: BodyType): BodyRenderStyle {
    return {
        fillColor: spec.color,
        texture: spec.texture ? AssetStore.getTexture(spec.texture) : null,
        label: spec.name,
        labelColor: spec.labelColor ?? getDefaultLabelColor(spec, bodyType),
        labelFontSize: spec.labelFontSize ?? getLabelFontSize(spec, bodyType),
    };
}

export function getDefaultLabelColor(spec: CelestialBodySpecDeprecated, bodyType: BodyType): string {
    if (bodyType === BodyType.MOON) {
        return 'rgba(255, 255, 255, 0.78)';
    }

    return spec.color;
}

export function getLabelFontSize(spec: CelestialBodySpecDeprecated, bodyType: BodyType): number {
    if (bodyType === BodyType.STAR) {
        return 20;
    }

    if (bodyType === BodyType.PLANET) {
        return 16;
    }

    if (bodyType === BodyType.MOON) {
        return 12;
    }

    return Math.round(clamp(10 + Math.sqrt(spec.radiusKm / EARTH_RADIUS_KM) * 2, 11, 17));
}
