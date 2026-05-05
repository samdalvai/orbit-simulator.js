import { Body, BodyType } from './Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from './BodyRenderStyle';
import {
    ASTEROID_RADIUS_RENDERING_SCALE,
    EARTH_RADIUS_KM,
    KILOMETERS_TO_PIXELS_RENDERING_SCALE,
    MIN_BODY_RENDERING_RADIUS,
    MIN_MOON_ORBIT_RENDERING_GAP,
    MOON_ORBIT_RENDERING_SCALE,
    MOON_RADIUS_RENDERING_SCALE,
    PLANET_RADIUS_RENDERING_SCALE,
    RADIUS_RENDERING_EXPONENT,
    STAR_RADIUS_RENDERING_SCALE,
} from './Constants';
import { Vec2 } from './Vec2';

export type RenderViewport = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    labelMargin: number;
};

export type WasmBodyRenderBuffers = {
    posX: ArrayLike<number>;
    posY: ArrayLike<number>;
    radiuses: ArrayLike<number>;
    bodyTypes: ArrayLike<number>;
    parents: ArrayLike<number>;
};

const SOLAR_MASS_KG = 1.98847e30;

export default class Graphics {
    static windowWidth: number;
    static windowHeight: number;
    static canvas: HTMLCanvasElement;
    static ctx: CanvasRenderingContext2D;

    static zoom = 1;
    static pan = new Vec2(0, 0);

    static openWindow(): boolean {
        const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.error('Failed to get 2D context for the canvas.');
            return false;
        }

        this.canvas = canvas;
        this.ctx = ctx;
        this.resize(canvas);

        window.addEventListener('resize', () => {
            this.resize(canvas);
        });

        return true;
    }

    static resize(canvas: HTMLCanvasElement): void {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;
    }

    static width(): number {
        return this.windowWidth;
    }

    static height(): number {
        return this.windowHeight;
    }

    static increaseZoom(): void {
        this.zoom *= 1.1;
    }

    static decreaseZoom(): void {
        this.zoom /= 1.1;
    }

    static zoomAt(screenX: number, screenY: number, factor: number): void {
        const worldXBeforeZoom = this.pan.x + (screenX - this.windowWidth / 2) / this.zoom;
        const worldYBeforeZoom = this.pan.y - (screenY - this.windowHeight / 2) / this.zoom;

        this.zoom *= factor;

        this.pan.x = worldXBeforeZoom - (screenX - this.windowWidth / 2) / this.zoom;
        this.pan.y = worldYBeforeZoom + (screenY - this.windowHeight / 2) / this.zoom;
    }

    static resetView(): void {
        this.zoom = 1;
        this.pan.x = 0;
        this.pan.y = 0;
    }

    static clearScreen(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    static getRenderViewport(): RenderViewport {
        const halfViewWidth = this.windowWidth / (2 * this.zoom);
        const halfViewHeight = this.windowHeight / (2 * this.zoom);

        return {
            minX: this.pan.x - halfViewWidth,
            minY: this.pan.y - halfViewHeight,
            maxX: this.pan.x + halfViewWidth,
            maxY: this.pan.y + halfViewHeight,
            labelMargin: 160 / this.zoom,
        };
    }

    /**
     * Start world coordinates to screen conversion.
     *
     * This is used because box 2d uses a standard coordinate system for objects
     * positions and dimensions
     */
    static beginWorld(): void {
        const ctx = this.ctx;

        ctx.save();

        // Move origin to screen center
        ctx.translate(this.windowWidth / 2, this.windowHeight / 2);

        // Flip Y axis (world Y up, canvas Y down)
        ctx.scale(this.zoom, -this.zoom);

        // Apply camera pan
        ctx.translate(-this.pan.x, -this.pan.y);

        ctx.lineWidth = 1 / this.zoom;
    }

    /** Restore coordinates to screen conversion */
    static endWorld(): void {
        this.ctx.restore();
    }

    // TODO: move width as second last parameter
    static drawLine(x0: number, y0: number, x1: number, y1: number, color = 'white', width = 1): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
    }

    static drawFillRect(x: number, y: number, width: number, height: number, color = 'white'): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    static drawStrokeRect(x: number, y: number, width: number, height: number, color = 'white', lineWidth = 1): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, width, height);
    }

    static drawCircle(radius: number, color = 'white'): void {
        // Draw the circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    static drawCircleAt(x: number, y: number, radius: number, color = 'white'): void {
        // Draw the circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    static drawFillCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    static drawTexture(
        width: number,
        height: number,
        texture: CanvasImageSource,
        offsetX = 0,
        offsetY = 0,
        textureScale = 1,
    ): void {
        this.ctx.save();

        this.ctx.translate(offsetX, offsetY);

        // This is needed because we flip the canvas with beginWorld()
        this.ctx.scale(textureScale, -textureScale);
        this.ctx.drawImage(texture, -width / 2, -height / 2, width, height);
        this.ctx.restore();
    }

    static drawText(
        text: string,
        x: number,
        y: number,
        fontSize: number = 20,
        fontFamily: string = 'Arial',
        color = 'white',
        align: CanvasTextAlign = 'left',
        baseline: CanvasTextBaseline = 'middle',
    ): void {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    static getBodyRenderPosition(body: Body): Vec2 {
        if (body.bodyType !== BodyType.MOON || !body.parent) {
            return body.position;
        }

        const parentPosition = this.getBodyRenderPosition(body.parent);
        const moonOffset = body.position.subNew(body.parent.position).scaleNew(MOON_ORBIT_RENDERING_SCALE);
        const moonOffsetMagnitude = moonOffset.magnitude();
        const minMoonOrbitDistance =
            (this.getBodyRenderRadius(body.parent) + this.getBodyRenderRadius(body) + MIN_MOON_ORBIT_RENDERING_GAP) /
            KILOMETERS_TO_PIXELS_RENDERING_SCALE;

        if (moonOffsetMagnitude > 0 && moonOffsetMagnitude < minMoonOrbitDistance) {
            moonOffset.scaleAssign(minMoonOrbitDistance / moonOffsetMagnitude);
        }

        return parentPosition.addNew(moonOffset);
    }

    static getBodyRenderPositionWasm(bodyIndex: number, bodies: WasmBodyRenderBuffers): Vec2 {
        const x = bodies.posX[bodyIndex];
        const y = bodies.posY[bodyIndex];
        const bodyType = bodies.bodyTypes[bodyIndex] as BodyType;
        const parentIndex = bodies.parents[bodyIndex];

        if (bodyType !== BodyType.MOON || parentIndex < 0 || parentIndex >= bodies.posX.length) {
            return new Vec2(x, y);
        }

        const parentPosition = this.getBodyRenderPositionWasm(parentIndex, bodies);
        const moonOffset = new Vec2(x - bodies.posX[parentIndex], y - bodies.posY[parentIndex]).scaleNew(
            MOON_ORBIT_RENDERING_SCALE,
        );
        const moonOffsetMagnitude = moonOffset.magnitude();
        const minMoonOrbitDistance =
            (this.getBodyRenderRadiusWasm(bodies.radiuses[parentIndex], bodies.bodyTypes[parentIndex] as BodyType) +
                this.getBodyRenderRadiusWasm(bodies.radiuses[bodyIndex], bodyType) +
                MIN_MOON_ORBIT_RENDERING_GAP) /
            KILOMETERS_TO_PIXELS_RENDERING_SCALE;

        if (moonOffsetMagnitude > 0 && moonOffsetMagnitude < minMoonOrbitDistance) {
            moonOffset.scaleAssign(minMoonOrbitDistance / moonOffsetMagnitude);
        }

        return parentPosition.addNew(moonOffset);
    }

    static getBodyRenderRadius(body: Body): number {
        const radius =
            Math.pow(body.radius / EARTH_RADIUS_KM, RADIUS_RENDERING_EXPONENT) *
            this.getBodyRadiusRenderingScale(body.bodyType);

        return Math.max(MIN_BODY_RENDERING_RADIUS, radius);
    }

    static getBodyRenderRadiusWasm(radius: number, bodyType: BodyType): number {
        const scaledRadius =
            Math.pow(radius / EARTH_RADIUS_KM, RADIUS_RENDERING_EXPONENT) * this.getBodyRadiusRenderingScale(bodyType);

        return Math.max(MIN_BODY_RENDERING_RADIUS, scaledRadius);
    }

    static getBodyRadiusRenderingScale(bodyType: BodyType): number {
        switch (bodyType) {
            case BodyType.STAR:
                return STAR_RADIUS_RENDERING_SCALE;
            case BodyType.MOON:
                return MOON_RADIUS_RENDERING_SCALE;
            case BodyType.ASTEROID:
                return ASTEROID_RADIUS_RENDERING_SCALE;
            case BodyType.PLANET:
            default:
                return PLANET_RADIUS_RENDERING_SCALE;
        }
    }

    static drawStarLight(body: Body, style: BodyRenderStyle | undefined, viewport: RenderViewport): void {
        if (body.bodyType !== BodyType.STAR) {
            return;
        }

        const renderStyle = style ?? DEFAULT_BODY_RENDER_STYLE;
        const renderPosition = this.getBodyRenderPosition(body);
        const x = renderPosition.x * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = renderPosition.y * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const radius = this.getBodyRenderRadius(body);
        const massFactor = Math.max(0.5, Math.min(4, Math.pow(body.mass / SOLAR_MASS_KG, 0.2)));
        const lightRadius = radius * (10 + massFactor * 0.1);

        if (
            x + lightRadius < viewport.minX ||
            x - lightRadius > viewport.maxX ||
            y + lightRadius < viewport.minY ||
            y - lightRadius > viewport.maxY
        ) {
            return;
        }

        const gradient = this.ctx.createRadialGradient(x, y, radius, x, y, lightRadius);
        gradient.addColorStop(0, renderStyle.fillColor);
        gradient.addColorStop(0.15, renderStyle.fillColor);
        gradient.addColorStop(1, 'transparent');

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.globalAlpha = Math.max(0.25, Math.min(0.75, 0.28 + massFactor * 0.12));
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, lightRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    static drawBody(
        body: Body,
        style: BodyRenderStyle | undefined,
        showTextures: boolean,
        showLabels: boolean,
        showMoonLabels: boolean,
        viewport: RenderViewport,
    ): void {
        const renderStyle = style ?? DEFAULT_BODY_RENDER_STYLE;
        const renderPosition = this.getBodyRenderPosition(body);
        const x = renderPosition.x * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = renderPosition.y * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const radius = this.getBodyRenderRadius(body);

        const strokeColor = 'white';
        const fillColor = renderStyle.fillColor;
        const texture = renderStyle.texture;
        const label = renderStyle.label;

        // Viewport culling for objects outside viewport
        const drawLabel = showLabels && label && (showMoonLabels || body.bodyType !== BodyType.MOON);
        const labelMargin = drawLabel ? viewport.labelMargin : 0;
        const renderOffsetX = renderPosition.x - body.position.x;
        const renderOffsetY = renderPosition.y - body.position.y;
        const minX = (body.minX + renderOffsetX) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const minY = (body.minY + renderOffsetY) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const maxX = (body.maxX + renderOffsetX) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const maxY = (body.maxY + renderOffsetY) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const aabbHalfWidth = (maxX - minX) * 0.5;
        const aabbHalfHeight = (maxY - minY) * 0.5;
        const paddingX = Math.max(0, radius - aabbHalfWidth) + labelMargin;
        const paddingY = Math.max(0, radius - aabbHalfHeight) + labelMargin;

        if (
            maxX + paddingX < viewport.minX ||
            minX - paddingX > viewport.maxX ||
            maxY + paddingY < viewport.minY ||
            minY - paddingY > viewport.maxY
        ) {
            return;
        }

        this.ctx.save();
        this.ctx.translate(x, y);

        if (!showTextures) {
            this.drawCircle(radius, strokeColor);
        } else if (texture) {
            this.drawTexture(radius * 2, radius * 2, texture, 0, 0, 1.2);
        } else {
            this.drawFillCircle(0, 0, radius, fillColor);
        }

        this.ctx.restore();

        if (drawLabel) {
            const labelColor = renderStyle.labelColor;
            const labelFontSize = renderStyle.labelFontSize;
            const labelGap = Math.max(8, labelFontSize * 0.6);

            this.ctx.save();
            this.ctx.translate(x + radius, y + radius);
            this.ctx.scale(1 / this.zoom, -1 / this.zoom);
            this.ctx.fillStyle = labelColor;
            this.ctx.font = `${labelFontSize}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(label, labelGap, -labelGap);
            this.ctx.restore();
        }
    }

    static drawBodyWasm(
        bodyIndex: number,
        bodies: WasmBodyRenderBuffers,
        style: BodyRenderStyle | undefined,
        // body: Body,
        // style: BodyRenderStyle | undefined,
        showTextures: boolean,
        // showLabels: boolean,
        // showMoonLabels: boolean,
        viewport: RenderViewport,
    ): void {
        const renderStyle = style ?? DEFAULT_BODY_RENDER_STYLE;
        const renderPosition = this.getBodyRenderPositionWasm(bodyIndex, bodies);
        const radius = bodies.radiuses[bodyIndex];
        const bodyType = bodies.bodyTypes[bodyIndex] as BodyType;
        const scaledX = renderPosition.x * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const scaledY = renderPosition.y * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const scaledRadius = this.getBodyRenderRadiusWasm(radius, bodyType);
        const strokeColor = 'white';
        const fillColor = renderStyle.fillColor;
        const texture = renderStyle.texture;
        const label = renderStyle.label;
        //     // Viewport culling for objects outside viewport
        //     const drawLabel = showLabels && label && (showMoonLabels || body.bodyType !== BodyType.MOON);
        //     const labelMargin = drawLabel ? viewport.labelMargin : 0;
        //     const renderOffsetX = renderPosition.x - body.position.x;
        //     const renderOffsetY = renderPosition.y - body.position.y;
        //     const minX = (body.minX + renderOffsetX) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        //     const minY = (body.minY + renderOffsetY) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        //     const maxX = (body.maxX + renderOffsetX) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        //     const maxY = (body.maxY + renderOffsetY) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        //     const aabbHalfWidth = (maxX - minX) * 0.5;
        //     const aabbHalfHeight = (maxY - minY) * 0.5;
        //     const paddingX = Math.max(0, radius - aabbHalfWidth) + labelMargin;
        //     const paddingY = Math.max(0, radius - aabbHalfHeight) + labelMargin;
        //     if (
        //         maxX + paddingX < viewport.minX ||
        //         minX - paddingX > viewport.maxX ||
        //         maxY + paddingY < viewport.minY ||
        //         minY - paddingY > viewport.maxY
        //     ) {
        //         return;
        //     }

        if (
            scaledX + scaledRadius < viewport.minX ||
            scaledX - scaledRadius > viewport.maxX ||
            scaledY + scaledRadius < viewport.minY ||
            scaledY - scaledRadius > viewport.maxY
        ) {
            return;
        }

        this.ctx.save();
        this.ctx.translate(scaledX, scaledY);
        if (!showTextures) {
            this.drawCircle(scaledRadius, strokeColor);
        } else if (texture) {
            this.drawTexture(scaledRadius * 2, scaledRadius * 2, texture, 0, 0, 1.2);
        } else {
            this.drawFillCircle(0, 0, scaledRadius, fillColor);
        }
        this.ctx.restore();
        //     if (drawLabel) {
        // const labelColor = renderStyle.labelColor;
        // const labelFontSize = renderStyle.labelFontSize;
        // const labelGap = Math.max(8, labelFontSize * 0.6);
        // this.ctx.save();
        // this.ctx.translate(scaledX + radius, scaledY + radius);
        // this.ctx.scale(1 / this.zoom, -1 / this.zoom);
        // this.ctx.fillStyle = labelColor;
        // this.ctx.font = `${labelFontSize}px Arial`;
        // this.ctx.textAlign = 'left';
        // this.ctx.textBaseline = 'bottom';
        // this.ctx.fillText(label, labelGap, -labelGap);
        // this.ctx.restore();
        //     }
    }
}
