import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { PolygonShape } from './PolygonShape';
import { ShapeType } from './Shape';

/**
 * Segment shapes are very thin and are meant to be used as static objects,
 * using them as dynamic objects makes them prone to collision tunneling
 */
export class SegmentShape extends PolygonShape {
    constructor(length: number, horizontal: boolean) {
        if (horizontal) {
            const verts = [new Vec2(-length / 2, 0), new Vec2(length / 2, 0)];
            super(verts);
        } else {
            const verts = [new Vec2(0, -length / 2), new Vec2(0, length / 2)];
            super(verts);
        }
    }

    getType(): ShapeType {
        return ShapeType.SEGMENT;
    }

    getMomentOfInertia(): number {
        const a = this.localVertices[0];
        const b = this.localVertices[1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const lengthSq = dx * dx + dy * dy;

        return lengthSq * 0.083333;
    }

    getArea(): number {
        // Segments with 0 thickness have area equal to 0
        return 0;
    }

    getPerimeter(): number {
        // Segments do not have a perimiter
        return 0;
    }

    updateVertices(angle: number, position: Vec2): void {
        super.updateVertices(angle, position);
    }

    updateAABB(body: RigidBody): void {
        super.updateAABB(body);
    }

    isPointInside(body: RigidBody, point: Vec2): boolean {
        const a = this.worldVertices[0];
        const b = this.worldVertices[1];

        const abX = b.x - a.x;
        const abY = b.y - a.y;
        const apX = point.x - a.x;
        const apY = point.y - a.y;

        const abLenSq = abX * abX + abY * abY;
        if (abLenSq === 0) {
            return false;
        }

        const t = (apX * abX + apY * abY) / abLenSq;
        if (t < 0 || t > 1) {
            return false;
        }

        const closestX = a.x + t * abX;
        const closestY = a.y + t * abY;

        const dx = point.x - closestX;
        const dy = point.y - closestY;

        const epsilon = 1e-8;
        return dx * dx + dy * dy <= epsilon * epsilon;
    }
}
