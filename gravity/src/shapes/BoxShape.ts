import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { PolygonShape } from './PolygonShape';
import { ShapeType } from './Shape';

export class BoxShape extends PolygonShape {
    // TODO: store halfwidth and height to avoid division by 2
    constructor(width: number, height: number) {
        const verts = [
            new Vec2(-width / 2, -height / 2),
            new Vec2(+width / 2, -height / 2),
            new Vec2(+width / 2, +height / 2),
            new Vec2(-width / 2, +height / 2),
        ];

        super(verts);

        this.width = width;
        this.height = height;
    }

    getType(): ShapeType {
        return ShapeType.BOX;
    }

    getMomentOfInertia(): number {
        // For a rectangle, the moment of inertia is 1/12 * (w^2 + h^2)
        // But this still needs to be multiplied by the rigidbody's mass
        return 0.083333 * (this.width * this.width + this.height * this.height);
    }

    getArea(): number {
        return this.width * this.height;
    }

    getPerimeter(): number {
        return 2 * this.width * this.height;
    }

    updateAABB(body: RigidBody): void {
        const hw = this.width * 0.5;
        const hh = this.height * 0.5;

        const cos = Math.cos(body.rotation);
        const sin = Math.sin(body.rotation);

        const ex = Math.abs(cos) * hw + Math.abs(sin) * hh;
        const ey = Math.abs(sin) * hw + Math.abs(cos) * hh;

        body.minX = body.position.x - ex;
        body.maxX = body.position.x + ex;
        body.minY = body.position.y - ey;
        body.maxY = body.position.y + ey;
    }

    isPointInside(body: RigidBody, point: Vec2): boolean {
        const hw = this.width * 0.5;
        const hh = this.height * 0.5;

        const dx = point.x - body.position.x;
        const dy = point.y - body.position.y;

        const cos = Math.cos(body.rotation);
        const sin = Math.sin(body.rotation);

        // Transform point into box local space using inverse rotation
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;

        return Math.abs(localX) <= hw && Math.abs(localY) <= hh;
    }
}
