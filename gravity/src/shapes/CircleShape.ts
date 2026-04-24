import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { Shape, ShapeType } from './Shape';

export class CircleShape extends Shape {
    constructor(radius: number) {
        super();
        this.radius = radius;
    }

    getType(): ShapeType {
        return ShapeType.CIRCLE;
    }

    getMomentOfInertia(): number {
        // For solid circles, the moment of inertia is 1/2 * r^2
        // But this still needs to be multiplied by the rigidbody's mass
        return 0.5 * (this.radius * this.radius);
    }

    getArea(): number {
        return Math.PI * this.radius * this.radius;
    }

    getPerimeter(): number {
        return 2 * Math.PI * this.radius;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateVertices(angle: number, position: Vec2): void {
        return; // Circles don't have vertices... nothing to do here
    }

    updateAABB(body: RigidBody): void {
        const radius = this.radius;
        body.minX = body.position.x - radius;
        body.maxX = body.position.x + radius;
        body.minY = body.position.y - radius;
        body.maxY = body.position.y + radius;
    }

    isPointInside(body: RigidBody, point: Vec2): boolean {
        const dx = point.x - body.position.x;
        const dy = point.y - body.position.y;

        const radius = this.radius;

        return dx * dx + dy * dy <= radius * radius;
    }
}
