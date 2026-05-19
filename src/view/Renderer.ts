import {
    KILOMETERS_TO_PIXELS_RENDERING_SCALE,
    MIN_MOON_ORBIT_RENDERING_GAP,
    MOON_ORBIT_RENDERING_SCALE,
    SOLAR_MASS_KG,
} from '../shared/Constants';
import { Vec3 } from '../shared/Vec3';
import {
    BodyType,
    NO_PARENT,
    aabbMaxX,
    aabbMaxY,
    aabbMinX,
    aabbMinY,
    bodyIds,
    bodyIndexById,
    bodyTypes,
    getBodyCount,
    mass,
    parentBodyIds,
    positionX,
    positionY,
    positionZ,
} from '../sim/Body';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE } from './BodyRenderStyle';
import { Camera3D } from './Camera3D';

export type RenderViewport = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    labelMargin: number;
};

type RenderItem = {
    index: number;
    depth: number;
    x: number;
    y: number;
    scale: number;
};

export default class Renderer {
    private windowWidth: number;
    private windowHeight: number;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private camera: Camera3D;
    private viewPort: RenderViewport;

    zoom = 1;
    pan = new Vec3(0, 0);

    // Cached values for rendering
    bodyRenderPositionX = 0;
    bodyRenderPositionY = 0;
    private bodyRenderStyles: Map<number, BodyRenderStyle>;

    constructor(bodyRenderStyles: Map<number, BodyRenderStyle>) {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get 2D context for the canvas.');
        }

        this.canvas = canvas;
        this.ctx = ctx;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;

        this.camera = new Camera3D(this.windowWidth, this.windowHeight);
        this.viewPort = {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
            labelMargin: 0,
        };

        this.bodyRenderStyles = bodyRenderStyles;

        window.addEventListener('resize', () => {
            this.resize(canvas);
        });
    }

    private resize(canvas: HTMLCanvasElement): void {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;
    }

    width(): number {
        return this.windowWidth;
    }

    height(): number {
        return this.windowHeight;
    }

    increaseZoom(): void {
        this.zoom += 0.05;
    }

    decreaseZoom(): void {
        this.zoom -= 0.05;

        if (this.zoom < 0.05) {
            this.zoom = 0.05;
        }
    }

    zoomAt(screenX: number, screenY: number, factor: number): void {
        const worldXBeforeZoom = this.pan.x + (screenX - this.windowWidth / 2) / this.zoom;
        const worldYBeforeZoom = this.pan.y - (screenY - this.windowHeight / 2) / this.zoom;

        this.zoom *= factor;

        this.pan.x = worldXBeforeZoom - (screenX - this.windowWidth / 2) / this.zoom;
        this.pan.y = worldYBeforeZoom + (screenY - this.windowHeight / 2) / this.zoom;
    }

    resetView(): void {
        this.zoom = 1;
        this.pan.x = 0;
        this.pan.y = 0;
    }

    clearScreen(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateViewport(): void {
        const halfViewWidth = this.windowWidth / (2 * this.zoom);
        const halfViewHeight = this.windowHeight / (2 * this.zoom);

        this.viewPort.minX = this.pan.x - halfViewWidth;
        this.viewPort.minY = this.pan.y - halfViewHeight;
        this.viewPort.maxX = this.pan.x + halfViewWidth;
        this.viewPort.maxY = this.pan.y + halfViewHeight;
        this.viewPort.labelMargin = 160 / this.zoom;
    }

    /**
     * Start world coordinates to screen conversion.
     *
     * This is used because box 2d uses a standard coordinate system for objects
     * positions and dimensions
     */
    beginWorld(): void {
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
    endWorld(): void {
        this.ctx.restore();
    }

    // TODO: move width as second last parameter
    drawLine(x0: number, y0: number, x1: number, y1: number, color = 'white', width = 1): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
    }

    drawFillRect(x: number, y: number, width: number, height: number, color = 'white'): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawStrokeRect(x: number, y: number, width: number, height: number, color = 'white', lineWidth = 1): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, width, height);
    }

    drawCircle(x: number, y: number, radius: number, color = 'white'): void {
        // Draw the circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    drawFillCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    drawTexture(
        x: number,
        y: number,
        width: number,
        height: number,
        texture: CanvasImageSource,
        textureScale = 1,
    ): void {
        // This is needed because we flip the canvas with beginWorld()
        this.ctx.scale(textureScale, -textureScale);
        this.ctx.drawImage(texture, x, y, width, height);
    }

    drawText(
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

    resolveBodyRenderPosition(bodyIndex: number, bodyStyle: BodyRenderStyle): void {
        if (bodyTypes[bodyIndex] !== BodyType.MOON || parentBodyIds[bodyIndex] === NO_PARENT) {
            this.bodyRenderPositionX = positionX[bodyIndex];
            this.bodyRenderPositionY = positionY[bodyIndex];
            return;
        }

        const parentId = parentBodyIds[bodyIndex];
        const parentIndex = bodyIndexById[parentId];
        this.resolveBodyRenderPosition(parentIndex, bodyStyle);

        const parentRenderX = this.bodyRenderPositionX;
        const parentRenderY = this.bodyRenderPositionY;
        let moonOffsetX = (positionX[bodyIndex] - positionX[parentIndex]) * MOON_ORBIT_RENDERING_SCALE;
        let moonOffsetY = (positionY[bodyIndex] - positionY[parentIndex]) * MOON_ORBIT_RENDERING_SCALE;

        const parentStyle = this.bodyRenderStyles.get(parentId) ?? DEFAULT_BODY_RENDER_STYLE;
        const minMoonOrbitDistance =
            (parentStyle.renderRadius + bodyStyle.renderRadius + MIN_MOON_ORBIT_RENDERING_GAP) /
            KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const moonOffsetMagnitudeSq = moonOffsetX * moonOffsetX + moonOffsetY * moonOffsetY;
        const minMoonOrbitDistanceSq = minMoonOrbitDistance * minMoonOrbitDistance;

        if (moonOffsetMagnitudeSq > 0 && moonOffsetMagnitudeSq < minMoonOrbitDistanceSq) {
            const orbitScale = minMoonOrbitDistance / Math.sqrt(moonOffsetMagnitudeSq);
            moonOffsetX *= orbitScale;
            moonOffsetY *= orbitScale;
        }

        this.bodyRenderPositionX = parentRenderX + moonOffsetX;
        this.bodyRenderPositionY = parentRenderY + moonOffsetY;
    }

    drawStarGlow(bodyIndex: number): void {
        if (bodyTypes[bodyIndex] !== BodyType.STAR) {
            return;
        }

        const renderStyle = this.bodyRenderStyles.get(bodyIds[bodyIndex]) ?? DEFAULT_BODY_RENDER_STYLE;
        this.resolveBodyRenderPosition(bodyIndex, renderStyle);
        const x = this.bodyRenderPositionX * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = this.bodyRenderPositionY * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const renderRadius = renderStyle.renderRadius;
        const massFactor = Math.max(0.5, Math.min(4, Math.pow(mass[bodyIndex] / SOLAR_MASS_KG, 0.2)));
        const lightRadius = renderRadius * (20 + massFactor * 0.1);

        if (
            x + lightRadius < this.viewPort.minX ||
            x - lightRadius > this.viewPort.maxX ||
            y + lightRadius < this.viewPort.minY ||
            y - lightRadius > this.viewPort.maxY
        ) {
            return;
        }

        const screenRadius = lightRadius * this.zoom;
        if (screenRadius < 0.5) {
            // total size of the glow is less than 1 px, skip drawing glow
            const screenPixel = 1 / this.zoom;
            const halfScreenPixel = -screenPixel / 2;
            this.drawFillRect(
                x + halfScreenPixel,
                y + halfScreenPixel,
                screenPixel,
                screenPixel,
                renderStyle.fillColor,
            );
            return;
        }

        const gradient = this.ctx.createRadialGradient(x, y, renderRadius, x, y, lightRadius);
        gradient.addColorStop(0, renderStyle.fillColor);
        gradient.addColorStop(0.1, renderStyle.fillColor);
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

    drawBody(bodyIndex: number, showTextures: boolean, showLabels: boolean, showMoonLabels: boolean): void {
        const renderStyle = this.bodyRenderStyles.get(bodyIds[bodyIndex]) ?? DEFAULT_BODY_RENDER_STYLE;
        this.resolveBodyRenderPosition(bodyIndex, renderStyle);
        const renderPositionX = this.bodyRenderPositionX;
        const renderPositionY = this.bodyRenderPositionY;
        const x = renderPositionX * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = renderPositionY * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const renderRadius = renderStyle.renderRadius;

        const strokeColor = 'white';
        const fillColor = renderStyle.fillColor;
        const texture = renderStyle.texture;
        const label = renderStyle.label;

        // Viewport culling for objects outside viewport
        const drawLabel = showLabels && label && (showMoonLabels || bodyTypes[bodyIndex] !== BodyType.MOON);
        const labelMargin = drawLabel ? this.viewPort.labelMargin : 0;
        const renderOffsetX = renderPositionX - positionX[bodyIndex];
        const renderOffsetY = renderPositionY - positionY[bodyIndex];
        const minXScreen = (aabbMinX[bodyIndex] + renderOffsetX) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const minYScreen = (aabbMinY[bodyIndex] + renderOffsetY) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const maxXScreen = (aabbMaxX[bodyIndex] + renderOffsetX) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const maxYScreen = (aabbMaxY[bodyIndex] + renderOffsetY) * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const aabbHalfWidth = (maxXScreen - minXScreen) * 0.5;
        const aabbHalfHeight = (maxYScreen - minYScreen) * 0.5;
        const paddingX = Math.max(0, renderRadius - aabbHalfWidth) + labelMargin;
        const paddingY = Math.max(0, renderRadius - aabbHalfHeight) + labelMargin;

        if (
            maxXScreen + paddingX < this.viewPort.minX ||
            minXScreen - paddingX > this.viewPort.maxX ||
            maxYScreen + paddingY < this.viewPort.minY ||
            minYScreen - paddingY > this.viewPort.maxY
        ) {
            return;
        }

        this.ctx.save();
        this.ctx.translate(x, y);

        const screenRadius = renderRadius * this.zoom;
        if (screenRadius < 0.5) {
            // total size of the body is less than 1 px, skip drawing textures
            const screenPixel = 1 / this.zoom;
            const halfScreenPixel = -screenPixel / 2;
            this.drawFillRect(halfScreenPixel, halfScreenPixel, screenPixel, screenPixel, fillColor);
        } else if (!showTextures) {
            this.drawCircle(0, 0, renderRadius, strokeColor);
        } else if (texture) {
            this.drawTexture(-renderRadius, -renderRadius, renderRadius * 2, renderRadius * 2, texture, 1.2);
        } else {
            this.drawFillCircle(0, 0, renderRadius, fillColor);
        }

        this.ctx.restore();

        if (drawLabel) {
            const labelColor = renderStyle.labelColor;
            const labelFontSize = renderStyle.labelFontSize;
            const labelGap = Math.max(8, labelFontSize * 0.6);

            this.ctx.save();
            this.ctx.translate(x + renderRadius, y + renderRadius);
            this.ctx.scale(1 / this.zoom, -1 / this.zoom);
            this.ctx.fillStyle = labelColor;
            this.ctx.font = `${labelFontSize}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(label, labelGap, -labelGap);
            this.ctx.restore();
        }
    }

    getRenderItems(): RenderItem[] {
        const renderItems: RenderItem[] = [];

        for (let i = 0; i < getBodyCount(); i++) {
            const projected = this.camera.project(positionX[i], positionY[i], positionZ[i]);

            if (projected === null) {
                continue;
            }

            renderItems.push({
                index: i,
                depth: projected.depth,
                x: projected.x,
                y: projected.y,
                scale: projected.scale,
            });
        }

        renderItems.sort((a, b) => b.depth - a.depth);
        return renderItems;
    }
}
