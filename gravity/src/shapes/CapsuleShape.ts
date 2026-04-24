import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { Shape, ShapeType } from './Shape';

export class CapsuleShape extends Shape {
    halfHeight: number;
    width: number;
    height: number;

    center1: Vec2;
    center2: Vec2;
    worldCenter1: Vec2;
    worldCenter2: Vec2;

    constructor(halfHeight: number, radius: number) {
        super();

        this.halfHeight = halfHeight;
        this.radius = radius;
        this.width = radius * 2;
        this.height = halfHeight * 2;

        this.center1 = new Vec2(0, halfHeight);
        this.center2 = new Vec2(0, -halfHeight);
        this.worldCenter1 = this.center1.copy();
        this.worldCenter2 = this.center2.copy();
    }

    get worldVertices() {
        return [this.worldCenter1, this.worldCenter2];
    }

    getType(): ShapeType {
        return ShapeType.CAPSULE;
    }

    getMomentOfInertia(): number {
        // For solid capsules, the moment of inertia is the sum of the two half circles and box body inertia, accounting fot heir position
        // Still needs to be multiplied by the rigidbody's mass
        const r = this.radius;
        const l = this.halfHeight * 2;

        const areaRect = 2 * r * l;
        const areaCircle = Math.PI * r * r;
        const areaTotal = areaRect + areaCircle;

        if (areaTotal === 0) return 0;

        const mRect = areaRect / areaTotal;
        const mCircle = areaCircle / areaTotal;

        const iRect = (1 / 12) * mRect * (l * l + 4 * r * r);
        const iCircle = 0.5 * mCircle * r * r + (mCircle * (l * l)) / 4;

        return iRect + iCircle;
    }

    getArea(): number {
        const areaCircle = Math.PI * this.radius * this.radius;
        const areaBody = this.radius * 2 * this.halfHeight * 2;
        return areaCircle + areaBody;
    }

    getPerimeter(): number {
        const perimCircle = 2 * Math.PI * this.radius;
        const perimBody = 2 * this.halfHeight * 2;
        return perimCircle + perimBody;
    }

    updateVertices(angle: number, position: Vec2): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        this.worldCenter1.x = this.center1.x * cos - this.center1.y * sin + position.x;
        this.worldCenter1.y = this.center1.x * sin + this.center1.y * cos + position.y;

        this.worldCenter2.x = this.center2.x * cos - this.center2.y * sin + position.x;
        this.worldCenter2.y = this.center2.x * sin + this.center2.y * cos + position.y;
    }

    updateAABB(body: RigidBody): void {
        body.minX = Math.min(this.worldCenter1.x, this.worldCenter2.x) - this.radius;
        body.minY = Math.min(this.worldCenter1.y, this.worldCenter2.y) - this.radius;
        body.maxX = Math.max(this.worldCenter1.x, this.worldCenter2.x) + this.radius;
        body.maxY = Math.max(this.worldCenter1.y, this.worldCenter2.y) + this.radius;
    }

    getTopCirclePosition(): Vec2 {
        return this.worldCenter1;
    }

    getBottomCirclePosition(): Vec2 {
        return this.worldCenter2;
    }

    isPointInside(body: RigidBody, point: Vec2): boolean {
        const a = this.worldCenter1;
        const b = this.worldCenter2;

        const abX = b.x - a.x;
        const abY = b.y - a.y;
        const apX = point.x - a.x;
        const apY = point.y - a.y;

        const abLenSq = abX * abX + abY * abY;

        if (abLenSq === 0) {
            const dx = point.x - a.x;
            const dy = point.y - a.y;
            return dx * dx + dy * dy <= this.radius * this.radius;
        }

        let t = (apX * abX + apY * abY) / abLenSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = a.x + t * abX;
        const closestY = a.y + t * abY;

        const dx = point.x - closestX;
        const dy = point.y - closestY;

        return dx * dx + dy * dy <= this.radius * this.radius;
    }
}
