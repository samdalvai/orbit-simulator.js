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
import { Camera3D, ProjectedPoint } from './Camera3D';

const MIN_ZOOM = 0.0001;

export type RenderItem = {
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

    zoom = 1;
    pan = new Vec3(0, 0);

    // Cached values for rendering
    bodyRenderPositionX = 0;
    bodyRenderPositionY = 0;
    bodyRenderPositionZ = 0;
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
        this.camera.resize(this.windowWidth, this.windowHeight);
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

        if (this.zoom < MIN_ZOOM) {
            this.zoom = MIN_ZOOM;
        }
    }

    zoomAt(screenX: number, screenY: number, factor: number): void {
        const oldPanX = this.pan.x;
        const oldPanY = this.pan.y;
        const oldZoom = this.zoom;
        const planeZ = this.pan.z;
        const beforeZoom = this.screenToWorldAtZ(screenX, screenY, planeZ);

        this.zoom = Math.max(MIN_ZOOM, this.zoom * factor);

        const afterZoom = this.screenToWorldAtZ(screenX, screenY, planeZ);

        if (beforeZoom !== null && afterZoom !== null) {
            this.pan.x += beforeZoom.x - afterZoom.x;
            this.pan.y += beforeZoom.y - afterZoom.y;
            return;
        }

        this.pan.x = oldPanX;
        this.pan.y = oldPanY;
        this.zoom = oldZoom;

        const worldXBeforeZoom = this.pan.x + (screenX - this.windowWidth / 2) / this.zoom;
        const worldYBeforeZoom = this.pan.y - (screenY - this.windowHeight / 2) / this.zoom;

        this.zoom = Math.max(MIN_ZOOM, this.zoom * factor);

        this.pan.x = worldXBeforeZoom - (screenX - this.windowWidth / 2) / this.zoom;
        this.pan.y = worldYBeforeZoom + (screenY - this.windowHeight / 2) / this.zoom;
    }

    panByScreenDelta(movementX: number, movementY: number): void {
        const planeZ = this.pan.z;
        const centerX = this.windowWidth * 0.5;
        const centerY = this.windowHeight * 0.5;
        const beforePan = this.screenToWorldAtZ(centerX, centerY, planeZ);
        const afterPan = this.screenToWorldAtZ(centerX - movementX, centerY - movementY, planeZ);

        if (beforePan !== null && afterPan !== null) {
            this.pan.x += afterPan.x - beforePan.x;
            this.pan.y += afterPan.y - beforePan.y;
            return;
        }

        this.pan.x -= movementX / this.zoom;
        this.pan.y += movementY / this.zoom;
    }

    rotateCamera(deltaYaw: number, deltaPitch: number): void {
        this.camera.rotate(deltaYaw, deltaPitch);
    }

    resetCameraOrientation(): void {
        this.camera.setRotation(0, 1);
    }

    yaw(): number {
        return this.camera.yaw;
    }

    pitch(): number {
        return this.camera.pitch;
    }

    resetView(): void {
        this.zoom = 1;
        this.pan.x = 0;
        this.pan.y = 0;
        this.pan.z = 0;
        this.resetCameraOrientation();
    }

    clearScreen(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
        this.ctx.save();
        this.ctx.scale(textureScale, -textureScale);
        this.ctx.drawImage(texture, x, y, width, height);
        this.ctx.restore();
    }

    drawScreenTexture(x: number, y: number, width: number, height: number, texture: CanvasImageSource): void {
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
            this.bodyRenderPositionZ = positionZ[bodyIndex];
            return;
        }

        const parentId = parentBodyIds[bodyIndex];
        const parentIndex = bodyIndexById[parentId];
        this.resolveBodyRenderPosition(parentIndex, bodyStyle);

        const parentRenderX = this.bodyRenderPositionX;
        const parentRenderY = this.bodyRenderPositionY;
        const parentRenderZ = this.bodyRenderPositionZ;
        let moonOffsetX = (positionX[bodyIndex] - positionX[parentIndex]) * MOON_ORBIT_RENDERING_SCALE;
        let moonOffsetY = (positionY[bodyIndex] - positionY[parentIndex]) * MOON_ORBIT_RENDERING_SCALE;
        let moonOffsetZ = (positionZ[bodyIndex] - positionZ[parentIndex]) * MOON_ORBIT_RENDERING_SCALE;

        const parentStyle = this.bodyRenderStyles.get(parentId) ?? DEFAULT_BODY_RENDER_STYLE;
        const minMoonOrbitDistance =
            (parentStyle.renderRadius + bodyStyle.renderRadius + MIN_MOON_ORBIT_RENDERING_GAP) /
            KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const moonOffsetMagnitudeSq = moonOffsetX * moonOffsetX + moonOffsetY * moonOffsetY + moonOffsetZ * moonOffsetZ;
        const minMoonOrbitDistanceSq = minMoonOrbitDistance * minMoonOrbitDistance;

        if (moonOffsetMagnitudeSq > 0 && moonOffsetMagnitudeSq < minMoonOrbitDistanceSq) {
            const orbitScale = minMoonOrbitDistance / Math.sqrt(moonOffsetMagnitudeSq);
            moonOffsetX *= orbitScale;
            moonOffsetY *= orbitScale;
            moonOffsetZ *= orbitScale;
        }

        this.bodyRenderPositionX = parentRenderX + moonOffsetX;
        this.bodyRenderPositionY = parentRenderY + moonOffsetY;
        this.bodyRenderPositionZ = parentRenderZ + moonOffsetZ;
    }

    drawStarGlow(renderItem: RenderItem): void {
        const bodyIndex = renderItem.index;

        if (bodyTypes[bodyIndex] !== BodyType.STAR) {
            return;
        }

        const renderStyle = this.bodyRenderStyles.get(bodyIds[bodyIndex]) ?? DEFAULT_BODY_RENDER_STYLE;
        const x = renderItem.x;
        const y = renderItem.y;
        const renderRadius = renderStyle.renderRadius;
        const massFactor = Math.max(0.5, Math.min(4, Math.pow(mass[bodyIndex] / SOLAR_MASS_KG, 0.2)));
        const lightRadius = renderRadius * (20 + massFactor * 0.1);
        const screenLightRadius = lightRadius * renderItem.scale;

        if (
            x + screenLightRadius < 0 ||
            x - screenLightRadius > this.windowWidth ||
            y + screenLightRadius < 0 ||
            y - screenLightRadius > this.windowHeight
        ) {
            return;
        }

        if (screenLightRadius < 0.5) {
            // total size of the glow is less than 1 px, skip drawing glow
            this.drawFillRect(x - 0.5, y - 0.5, 1, 1, renderStyle.fillColor);
            return;
        }

        const screenRenderRadius = renderRadius * renderItem.scale;
        const gradient = this.ctx.createRadialGradient(x, y, screenRenderRadius, x, y, screenLightRadius);
        gradient.addColorStop(0, renderStyle.fillColor);
        gradient.addColorStop(0.1, renderStyle.fillColor);
        gradient.addColorStop(1, 'transparent');

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.globalAlpha = Math.max(0.25, Math.min(0.75, 0.28 + massFactor * 0.12));
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, screenLightRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawBody(renderItem: RenderItem, showTextures: boolean, showLabels: boolean, showMoonLabels: boolean): void {
        const bodyIndex = renderItem.index;
        const renderStyle = this.bodyRenderStyles.get(bodyIds[bodyIndex]) ?? DEFAULT_BODY_RENDER_STYLE;
        const x = renderItem.x;
        const y = renderItem.y;
        const renderRadius = renderStyle.renderRadius;
        const screenRadius = renderRadius * renderItem.scale;

        const strokeColor = 'white';
        const fillColor = renderStyle.fillColor;
        const texture = renderStyle.texture;
        const label = renderStyle.label;

        // Viewport culling for objects outside viewport
        const drawLabel = showLabels && label && (showMoonLabels || bodyTypes[bodyIndex] !== BodyType.MOON);
        const labelMargin = drawLabel ? 160 : 0;
        const cullingRadius = Math.max(screenRadius, 0.5) + labelMargin;

        if (
            x + cullingRadius < 0 ||
            x - cullingRadius > this.windowWidth ||
            y + cullingRadius < 0 ||
            y - cullingRadius > this.windowHeight
        ) {
            return;
        }

        this.ctx.save();

        if (screenRadius < 0.5) {
            // total size of the body is less than 1 px, skip drawing textures
            this.drawFillRect(x - 0.5, y - 0.5, 1, 1, fillColor);
        } else if (!showTextures) {
            this.drawCircle(x, y, screenRadius, strokeColor);
        } else if (texture) {
            const textureRadius = screenRadius * 1.2;
            this.drawScreenTexture(x - textureRadius, y - textureRadius, textureRadius * 2, textureRadius * 2, texture);
        } else {
            this.drawFillCircle(x, y, screenRadius, fillColor);
        }

        this.ctx.restore();

        if (drawLabel) {
            const labelColor = renderStyle.labelColor;
            const labelFontSize = renderStyle.labelFontSize;
            const labelGap = Math.max(8, labelFontSize * 0.6);

            this.ctx.save();
            this.ctx.fillStyle = labelColor;
            this.ctx.font = `${labelFontSize}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(label, x + screenRadius + labelGap, y - screenRadius - labelGap);
            this.ctx.restore();
        }
    }

    private syncCameraFromView(): void {
        this.camera.lookAt(this.pan.x, this.pan.y, this.pan.z, this.camera.focalLength / this.zoom);
    }

    screenToWorldAtZ(screenX: number, screenY: number, worldZ: number): Vec3 | null {
        this.syncCameraFromView();
        return this.camera.screenToWorldAtZ(screenX, screenY, worldZ);
    }

    private projectBody(bodyIndex: number, renderStyle: BodyRenderStyle): ProjectedPoint | null {
        this.resolveBodyRenderPosition(bodyIndex, renderStyle);
        return this.camera.project(
            this.bodyRenderPositionX * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
            this.bodyRenderPositionY * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
            this.bodyRenderPositionZ * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
        );
    }

    getRenderItems(): RenderItem[] {
        const renderItems: RenderItem[] = [];
        this.syncCameraFromView();

        for (let i = 0; i < getBodyCount(); i++) {
            const renderStyle = this.bodyRenderStyles.get(bodyIds[i]) ?? DEFAULT_BODY_RENDER_STYLE;
            const projected = this.projectBody(i, renderStyle);

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
