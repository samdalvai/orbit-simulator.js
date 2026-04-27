import { Body, BodyType } from './Body';
import {
    EARTH_RADIUS_KM,
    MOON_ORBIT_RENDER_SCALE,
    PIXELS_PER_KM,
    PIXEL_PER_KM_RADIUS,
    RADIUS_SCALE_EXPONENT,
} from './Constants';
import { Vec2 } from './Vec2';

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
        this.zoom += 0.05;
    }

    static decreaseZoom(): void {
        this.zoom -= 0.05;

        if (this.zoom < 0.05) {
            this.zoom = 0.05;
        }
    }

    static resetView(): void {
        this.zoom = 1;
        this.pan.x = 0;
        this.pan.y = 0;
    }

    static clearScreen(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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

    private static getBodyRenderPosition(body: Body): Vec2 {
        if (body.bodyType !== BodyType.MOON || !body.parent) {
            return body.position;
        }

        const parentPosition = this.getBodyRenderPosition(body.parent);
        const moonOffset = body.position.subNew(body.parent.position).scaleNew(MOON_ORBIT_RENDER_SCALE);

        return parentPosition.addNew(moonOffset);
    }

    static drawBody(body: Body, showTextures: boolean, showLabels: boolean): void {
        const renderPosition = this.getBodyRenderPosition(body);
        const x = renderPosition.x * PIXELS_PER_KM;
        const y = renderPosition.y * PIXELS_PER_KM;
        const radius = Math.max(
            2,
            Math.pow(body.radius / EARTH_RADIUS_KM, RADIUS_SCALE_EXPONENT) * PIXEL_PER_KM_RADIUS,
        );

        this.ctx.save();
        this.ctx.translate(x, y);

        const strokeColor = 'white';
        const fillColor = body.fillColor ?? 'yellow';
        const texture = body.texture;
        const label = body.label;

        if (!showTextures) {
            this.drawCircle(radius, strokeColor);
        } else if (texture) {
            this.drawTexture(radius * 2, radius * 2, texture, 0, 0, 1.2);
        } else {
            this.drawFillCircle(0, 0, radius, fillColor);
        }

        this.ctx.restore();

        if (showLabels && label) {
            const labelColor = 'white';
            const labelFontSize = 12;

            this.ctx.save();
            this.ctx.translate(x + radius, y + radius);
            this.ctx.scale(1 / this.zoom, -1 / this.zoom);
            this.ctx.fillStyle = labelColor;
            this.ctx.font = `${labelFontSize}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(label, 8, -8);
            this.ctx.restore();
        }
    }
}
