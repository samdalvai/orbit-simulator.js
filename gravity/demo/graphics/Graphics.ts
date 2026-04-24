import { BoxShape, CapsuleShape, CircleShape, PolygonShape, RigidBody, SegmentShape, ShapeType, Vec2 } from '../../src';
import type { BodyRenderStyle } from '../render/BodyRenderRegistry';

export default class Graphics {
    static windowWidth: number;
    static windowHeight: number;
    static canvas: HTMLCanvasElement;
    static ctx: CanvasRenderingContext2D;

    static zoom = 1;
    static pan = new Vec2(0, 0);

    static openWindow(): boolean {
        const canvas = document.getElementById('gamePhysicsCanvas') as HTMLCanvasElement;
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

    static drawArrow(x0: number, y0: number, x1: number, y1: number, color = 'white', width = 1, headSize = 6): void {
        this.drawLine(x0, y0, x1, y1, color, width);

        const angle = Math.atan2(y1 - y0, x1 - x0);
        const leftX = x1 - headSize * Math.cos(angle - Math.PI / 6);
        const leftY = y1 - headSize * Math.sin(angle - Math.PI / 6);
        const rightX = x1 - headSize * Math.cos(angle + Math.PI / 6);
        const rightY = y1 - headSize * Math.sin(angle + Math.PI / 6);

        this.drawLine(x1, y1, leftX, leftY, color, width);
        this.drawLine(x1, y1, rightX, rightY, color, width);
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

        // Draw the line from center to circle edge at given angle
        const endX = Math.cos(0) * radius;
        const endY = Math.sin(0) * radius;

        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    static drawHalfCircle(x: number, y: number, radius: number, half: 'top' | 'bottom', color = 'white'): void {
        let localStart: number;
        let localEnd: number;

        if (half === 'top') {
            localStart = 0;
            localEnd = Math.PI;
        } else {
            localStart = Math.PI;
            localEnd = Math.PI * 2;
        }

        // Draw rotated arc
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, localStart, localEnd);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    static drawFillCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    static drawFillCircleClippedBelow(x: number, y: number, radius: number, clipY: number, color = 'white'): void {
        const ctx = this.ctx;

        ctx.save();

        // Clip region: everything BELOW clipY
        ctx.beginPath();
        ctx.rect(-1e6, -1e6, 2e6, clipY + 1e6);
        // big rectangle from top of canvas down to clipY
        ctx.clip();

        // Draw full circle, but it will be clipped
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
    }

    static drawPolygon(vertices: Vec2[], color = 'white'): void {
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();

        if (vertices.length > 0) {
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            this.ctx.closePath();
        }

        this.ctx.stroke();

        // draw the 1px center point like filledCircleColor(..., radius=1)
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    static drawFillPolygon(x: number, y: number, vertices: Vec2[], color = 'white'): void {
        if (vertices.length === 0) return;

        // Fill polygon
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            this.ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    static drawRect(x: number, y: number, width: number, height: number, color = 'white'): void {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - halfWidth, y - halfHeight);
        this.ctx.lineTo(x + halfWidth, y - halfHeight);
        this.ctx.lineTo(x + halfWidth, y + halfHeight);
        this.ctx.lineTo(x - halfWidth, y + halfHeight);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    static drawBox(width: number, height: number, color = 'white') {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.ctx.beginPath();
        this.ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();

        // draw the 1px center point like filledCircleColor(..., radius=1)
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    static drawFillBox(width: number, height: number, color = 'white') {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
    }

    static drawCapsule(capsuleShape: CapsuleShape, color = 'white'): void {
        const r = capsuleShape.radius;
        const hh = capsuleShape.halfHeight;

        this.ctx.beginPath();

        this.ctx.moveTo(-r, hh);
        this.ctx.arc(0, -hh, r, Math.PI, 0);
        this.ctx.lineTo(r, -hh);
        this.ctx.arc(0, hh, r, 0, Math.PI);
        this.ctx.lineTo(-r, hh);

        this.ctx.closePath();

        this.ctx.strokeStyle = color;
        this.ctx.stroke();

        // Draw body position
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    static drawFillCapsule(capsuleShape: CapsuleShape, color = 'white'): void {
        const r = capsuleShape.radius;
        const hh = capsuleShape.halfHeight;

        this.ctx.beginPath();

        this.ctx.moveTo(-r, hh);
        this.ctx.arc(0, -hh, r, Math.PI, 0);
        this.ctx.lineTo(r, -hh);
        this.ctx.arc(0, hh, r, 0, Math.PI);
        this.ctx.lineTo(-r, hh);

        this.ctx.closePath();

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

    static drawBody(body: RigidBody, renderStyle?: BodyRenderStyle, debug = false, showLabels = true): void {
        const x = body.position.x;
        const y = body.position.y;
        const rotation = body.rotation;
        const fillColor = renderStyle?.fillColor ?? 'gray';
        const strokeColor = renderStyle?.strokeColor ?? 'white';
        const texture = renderStyle?.texture ?? null;
        const textureScale = renderStyle?.textureScale ?? 1;
        const label = renderStyle?.label;
        const labelColor = renderStyle?.labelColor ?? 'white';
        const labelFontSize = renderStyle?.labelFontSize ?? 12;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);

        // TODO: Draw filled shape if texture is not available

        switch (body.shape.getType()) {
            case ShapeType.CIRCLE:
                {
                    const circleShape = body.shape as CircleShape;
                    if (debug) {
                        this.drawCircle(circleShape.radius, body.isBullet ? 'red' : strokeColor);
                    } else if (texture) {
                        this.drawTexture(circleShape.radius * 2, circleShape.radius * 2, texture, 0, 0, textureScale);
                    } else {
                        this.drawFillCircle(0, 0, circleShape.radius, fillColor);
                    }
                }
                break;
            case ShapeType.POLYGON:
                {
                    const polygonShape = body.shape as PolygonShape;

                    if (debug) {
                        this.drawPolygon(polygonShape.localVertices, strokeColor);
                    } else if (texture) {
                        this.drawTexture(polygonShape.width, polygonShape.height, texture, 0, 0, textureScale);
                    } else {
                        this.drawFillPolygon(0, 0, polygonShape.localVertices, fillColor);
                    }
                }
                break;
            case ShapeType.BOX:
                {
                    const boxShape = body.shape as BoxShape;

                    if (debug) {
                        this.drawBox(boxShape.width, boxShape.height, strokeColor);
                    } else if (texture) {
                        this.drawTexture(boxShape.width, boxShape.height, texture, 0, 0, textureScale);
                    } else {
                        this.drawFillBox(boxShape.width, boxShape.height, fillColor);
                    }
                }
                break;
            case ShapeType.CAPSULE:
                {
                    const capsuleShape = body.shape as CapsuleShape;

                    if (debug) {
                        this.drawCapsule(capsuleShape, strokeColor);
                    } else if (texture) {
                        // TODO: draw texture without stretching it
                        this.drawTexture(
                            capsuleShape.width,
                            capsuleShape.height + capsuleShape.radius * 2,
                            texture,
                            textureScale,
                        );
                    } else {
                        this.drawFillCapsule(capsuleShape, fillColor);
                    }
                }
                break;
            case ShapeType.SEGMENT:
                {
                    const segmentShape = body.shape as SegmentShape;
                    const vertices = segmentShape.localVertices;
                    const v0 = vertices[0];
                    const v1 = vertices[1];

                    if (debug) {
                        this.drawLine(v0.x, v0.y, v1.x, v1.y, strokeColor);
                        this.drawFillCircle(0, 0, 2, strokeColor);
                    } else if (texture) {
                        // TODO: support textured segment rendering if needed
                    } else {
                        this.drawLine(v0.x, v0.y, v1.x, v1.y, strokeColor);
                        this.drawFillCircle(0, 0, 2, strokeColor);
                    }
                }
                break;
        }

        this.ctx.restore();

        if (showLabels && label) {
            this.ctx.save();
            this.ctx.translate(body.maxX, body.maxY);
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
