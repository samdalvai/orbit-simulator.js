import {
    ASTEROID_RADIUS_RENDERING_SCALE,
    COMET_RADIUS_RENDERING_SCALE,
    EARTH_RADIUS_KM,
    MOON_RADIUS_RENDERING_SCALE,
    PLANET_RADIUS_RENDERING_SCALE,
    RADIUS_RENDERING_EXPONENT,
    STAR_RADIUS_RENDERING_SCALE,
} from '../shared/Constants';
import { BodyType } from '../sim/Body';

export type BodyRenderStyle = {
    fillColor: string;
    texture: ImageBitmap | null;
    label: string;
    labelColor: string;
    labelFontSize: number;
    renderRadius: number;
};

export const DEFAULT_BODY_RENDER_STYLE: BodyRenderStyle = {
    fillColor: 'white',
    texture: null,
    label: '',
    labelColor: 'white',
    labelFontSize: 12,
    renderRadius: 1,
};

export function getBodyRenderRadius(radius: number, bodyType: BodyType): number {
    return Math.pow(radius / EARTH_RADIUS_KM, RADIUS_RENDERING_EXPONENT) * getBodyRadiusRenderingScale(bodyType);
}

function getBodyRadiusRenderingScale(bodyType: BodyType): number {
    switch (bodyType) {
        case BodyType.STAR:
            return STAR_RADIUS_RENDERING_SCALE;
        case BodyType.MOON:
            return MOON_RADIUS_RENDERING_SCALE;
        case BodyType.ASTEROID:
            return ASTEROID_RADIUS_RENDERING_SCALE;
        case BodyType.PLANET:
            return PLANET_RADIUS_RENDERING_SCALE;
        case BodyType.COMET:
            return COMET_RADIUS_RENDERING_SCALE;
        default:
            return PLANET_RADIUS_RENDERING_SCALE;
    }
}
