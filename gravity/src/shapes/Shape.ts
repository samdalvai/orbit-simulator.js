import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';

export enum ShapeType {
    CIRCLE,
    POLYGON,
    BOX,
    CAPSULE,
    SEGMENT,
}

export abstract class Shape {
    radius = 0;

    abstract getType(): ShapeType;
    abstract getMomentOfInertia(): number;
    abstract getArea(): number;
    abstract getPerimeter(): number;
    abstract updateVertices(angle: number, position: Vec2): void;
    abstract updateAABB(body: RigidBody): void;
    abstract isPointInside(body: RigidBody, point: Vec2): boolean;
}
