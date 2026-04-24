import { CollisionCategory } from '../collision/CollisionFilter';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { BoxShape } from '../shapes/BoxShape';
import { CapsuleShape } from '../shapes/CapsuleShape';
import { CircleShape } from '../shapes/CircleShape';
import { PolygonShape } from '../shapes/PolygonShape';
import { SegmentShape } from '../shapes/SegmentShape';
import { Shape } from '../shapes/Shape';

export type BodyOptions = {
    x: number;
    y: number;
    rotation?: number;
    velocity?: Vec2;
    angularVelocity?: number;
    canRotate?: boolean;
    isBullet?: boolean;
    collisionCategory?: CollisionCategory;
    collisionMask?: CollisionCategory;
} & BodyMaterialOptions;

type MassOnly = {
    mass: number;
    density?: undefined;
};

type DensityOnly = {
    density: number;
    mass?: undefined;
};

export type BodyMaterialOptions = (MassOnly | DensityOnly) & {
    restitution?: number;
    friction?: number;
    rollingResistance?: number;
    surfaceSpeed?: number;
    charge?: number;
    temperature?: number;
    gravityScale?: number;
};

export type BoxBodyOptions = {
    width: number;
    height: number;
} & BodyOptions;

export type CircleBodyOptions = {
    radius: number;
} & BodyOptions;

export type CapsuleBodyOptions = {
    halfHeight: number;
    radius: number;
} & BodyOptions;

export type PolygonBodyOptions = {
    vertices: readonly Vec2[];
} & BodyOptions;

export type SegmentBodyOptions = {
    length: number;
    horizontal: boolean;
} & BodyOptions;

export class BodiesFactory {
    static fromShape(shape: Shape, options: BodyOptions): RigidBody {
        const body = new RigidBody(shape, options.x, options.y, options.mass, options.density);
        return applyBodyOptions(body, options);
    }

    static box(options: BoxBodyOptions): RigidBody {
        const { width, height, ...bodyOptions } = options;
        return BodiesFactory.fromShape(new BoxShape(width, height), bodyOptions);
    }

    static circle(options: CircleBodyOptions): RigidBody {
        const { radius, ...bodyOptions } = options;
        return BodiesFactory.fromShape(new CircleShape(radius), bodyOptions);
    }

    static capsule(options: CapsuleBodyOptions): RigidBody {
        const { halfHeight, radius, ...bodyOptions } = options;
        return BodiesFactory.fromShape(new CapsuleShape(halfHeight, radius), bodyOptions);
    }

    static polygon(options: PolygonBodyOptions): RigidBody {
        const { vertices, ...bodyOptions } = options;
        return BodiesFactory.fromShape(new PolygonShape([...vertices]), bodyOptions);
    }

    static segment(options: SegmentBodyOptions): RigidBody {
        const { length, horizontal, ...bodyOptions } = options;
        return BodiesFactory.fromShape(new SegmentShape(length, horizontal), bodyOptions);
    }
}

function applyBodyOptions(body: RigidBody, options: BodyOptions): RigidBody {
    if (options.rotation !== undefined) {
        body.rotation = options.rotation;
    }

    if (options.velocity !== undefined) {
        body.velocity = options.velocity.copy();
    }

    if (options.angularVelocity !== undefined) {
        body.angularVelocity = options.angularVelocity;
    }

    if (options.canRotate !== undefined) {
        body.canRotate = options.canRotate;
    }

    if (options.restitution !== undefined) {
        body.restitution = options.restitution;
    }

    if (options.friction !== undefined) {
        body.friction = options.friction;
    }

    if (options.rollingResistance !== undefined) {
        body.rollingResistance = options.rollingResistance;
    }

    if (options.charge !== undefined) {
        body.charge = options.charge;
    }

    if (options.surfaceSpeed !== undefined) {
        body.surfaceSpeed = options.surfaceSpeed;
    }

    if (options.temperature !== undefined) {
        body.temperature = options.temperature;
    }

    if (options.gravityScale !== undefined) {
        body.gravityScale = options.gravityScale;
    }

    if (options.isBullet !== undefined) {
        body.isBullet = options.isBullet;
    }

    if (options.collisionCategory !== undefined) {
        body.collisionCategory = options.collisionCategory;
    }

    if (options.collisionMask !== undefined) {
        body.collisionMask = options.collisionMask;
    }

    body.shape.updateVertices(body.rotation, body.position);
    body.shape.updateAABB(body);

    return body;
}
