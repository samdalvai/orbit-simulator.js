import { describe, expect, test } from '@jest/globals';

import * as Collision from '../../src/collision/NarrowPhase';
import { SETTINGS } from '../../src/core/Constants';
import { RigidBody } from '../../src/core/RigidBody';
import { Vec2 } from '../../src/math/Vec2';
import { BoxShape } from '../../src/shapes/BoxShape';
import { CapsuleShape } from '../../src/shapes/CapsuleShape';
import { CircleShape } from '../../src/shapes/CircleShape';
import { PolygonShape } from '../../src/shapes/PolygonShape';
import { SegmentShape } from '../../src/shapes/SegmentShape';

type BodyFactory = (x: number, y: number) => RigidBody;

type Position = {
    x: number;
    y: number;
};

type PairCase = {
    name: string;
    createA: BodyFactory;
    createB: BodyFactory;
    collidingPositionB: Position;
    nonCollidingPositionB: Position;
};

function triangleVertices(): Vec2[] {
    return [new Vec2(30, 30), new Vec2(-30, 30), new Vec2(0, -30)];
}

function createCircle(x: number, y: number): RigidBody {
    return new RigidBody(new CircleShape(30), x, y, 1.0);
}

function createBox(x: number, y: number): RigidBody {
    return new RigidBody(new BoxShape(60, 60), x, y, 1.0);
}

function createTriangle(x: number, y: number): RigidBody {
    return new RigidBody(new PolygonShape(triangleVertices()), x, y, 1.0);
}

function createCapsule(x: number, y: number): RigidBody {
    return new RigidBody(new CapsuleShape(40, 10), x, y, 1.0);
}

function createHorizontalSegment(x: number, y: number): RigidBody {
    return new RigidBody(new SegmentShape(100, true), x, y, 0.0);
}

function createVerticalSegment(x: number, y: number): RigidBody {
    return new RigidBody(new SegmentShape(100, false), x, y, 0.0);
}

const pairCases: PairCase[] = [
    {
        name: 'circle and circle',
        createA: createCircle,
        createB: createCircle,
        collidingPositionB: { x: 30, y: 0 },
        nonCollidingPositionB: { x: 100, y: 0 },
    },
    {
        name: 'circle and box',
        createA: createCircle,
        createB: createBox,
        collidingPositionB: { x: 30, y: 0 },
        nonCollidingPositionB: { x: 120, y: 120 },
    },
    {
        name: 'circle and polygon',
        createA: createCircle,
        createB: createTriangle,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 200, y: 0 },
    },
    {
        name: 'circle and capsule',
        createA: createCircle,
        createB: createCapsule,
        collidingPositionB: { x: 20, y: 0 },
        nonCollidingPositionB: { x: 120, y: 0 },
    },
    {
        name: 'circle and segment',
        createA: createCircle,
        createB: createHorizontalSegment,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 0, y: 100 },
    },
    {
        name: 'box and box',
        createA: createBox,
        createB: createBox,
        collidingPositionB: { x: 30, y: 0 },
        nonCollidingPositionB: { x: 200, y: 200 },
    },
    {
        name: 'box and polygon',
        createA: createBox,
        createB: createTriangle,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 200, y: 0 },
    },
    {
        name: 'box and capsule',
        createA: createBox,
        createB: createCapsule,
        collidingPositionB: { x: 20, y: 0 },
        nonCollidingPositionB: { x: 120, y: 0 },
    },
    {
        name: 'box and segment',
        createA: createBox,
        createB: createHorizontalSegment,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 0, y: 100 },
    },
    {
        name: 'polygon and polygon',
        createA: createTriangle,
        createB: createTriangle,
        collidingPositionB: { x: 0, y: 15 },
        nonCollidingPositionB: { x: 200, y: 0 },
    },
    {
        name: 'polygon and capsule',
        createA: createTriangle,
        createB: createCapsule,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 200, y: 0 },
    },
    {
        name: 'polygon and segment',
        createA: createTriangle,
        createB: createHorizontalSegment,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 0, y: 100 },
    },
    {
        name: 'capsule and capsule',
        createA: createCapsule,
        createB: createCapsule,
        collidingPositionB: { x: 20, y: 0 },
        nonCollidingPositionB: { x: 120, y: 0 },
    },
    {
        name: 'capsule and segment',
        createA: createCapsule,
        createB: createHorizontalSegment,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 0, y: 120 },
    },
    {
        name: 'segment and segment',
        createA: createHorizontalSegment,
        createB: createVerticalSegment,
        collidingPositionB: { x: 0, y: 0 },
        nonCollidingPositionB: { x: 120, y: 0 },
    },
];

function expectCollidingPair(createA: BodyFactory, createB: BodyFactory, positionB: Position): void {
    const forward = Collision.detectCollision(createA(0, 0), createB(positionB.x, positionB.y));
    const reverse = Collision.detectCollision(createB(positionB.x, positionB.y), createA(0, 0));

    expect(forward).not.toBeNull();
    expect(forward?.points.length ?? 0).toBeGreaterThan(0);
    expect(forward?.penetrationDepth ?? -1).toBeGreaterThanOrEqual(0);

    expect(reverse).not.toBeNull();
    expect(reverse?.points.length ?? 0).toBeGreaterThan(0);
    expect(reverse?.penetrationDepth ?? -1).toBeGreaterThanOrEqual(0);

    if (forward && reverse) {
        expect(reverse.penetrationDepth).toBeCloseTo(forward.penetrationDepth);
    }
}

function expectNonCollidingPair(createA: BodyFactory, createB: BodyFactory, positionB: Position): void {
    const forward = Collision.detectCollision(createA(0, 0), createB(positionB.x, positionB.y));
    const reverse = Collision.detectCollision(createB(positionB.x, positionB.y), createA(0, 0));

    expect(forward).toBeNull();
    expect(reverse).toBeNull();
}

describe('Collision', () => {
    describe.each(pairCases)('$name', ({ createA, createB, collidingPositionB, nonCollidingPositionB }) => {
        test('detectCollision() detects colliding shapes', () => {
            expectCollidingPair(createA, createB, collidingPositionB);
        });

        test('detectCollision() skips non colliding shapes', () => {
            expectNonCollidingPair(createA, createB, nonCollidingPositionB);
        });
    });

    test('detectCollision() keeps circle contacts within contact slop', () => {
        const a = createCircle(0, 0);
        const b = createCircle(60 + SETTINGS.contactSlop * 0.5, 0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points).toHaveLength(1);
        expect(result?.penetrationDepth).toBe(0);
    });

    test('detectCollision() keeps box and circle contacts within contact slop', () => {
        const a = createBox(0, 0);
        const b = createCircle(60 + SETTINGS.contactSlop * 0.5, 0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points).toHaveLength(1);
        expect(result?.penetrationDepth).toBe(0);
    });

    test('detectCollision() detects collision for clockwise-wound convex polygons', () => {
        const pentagonVertices = [
            new Vec2(0, 46),
            new Vec2(42, 14),
            new Vec2(26, -38),
            new Vec2(-26, -38),
            new Vec2(-42, 14),
        ];
        const a = new RigidBody(new PolygonShape(pentagonVertices), 0, 0, 1.0);
        const b = createBox(0, 0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points.length).toBeGreaterThan(0);
        expect(result?.penetrationDepth).toBeGreaterThan(0);
    });

    test('detectCollision() detects collision for counter-clockwise-wound convex polygons', () => {
        const pentagonVertices = [
            new Vec2(-42, 14),
            new Vec2(-26, -38),
            new Vec2(26, -38),
            new Vec2(42, 14),
            new Vec2(0, 46),
        ];
        const a = new RigidBody(new PolygonShape(pentagonVertices), 0, 0, 1.0);
        const b = createBox(0, 0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points.length).toBeGreaterThan(0);
        expect(result?.penetrationDepth).toBeGreaterThan(0);
    });

    test('detectCollision() keeps box and capsule contacts within contact slop', () => {
        const a = createBox(0, 0);
        const b = createCapsule(40 + SETTINGS.contactSlop * 0.5, 0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points.length).toBeGreaterThan(0);
        expect(result?.penetrationDepth).toBe(0);
    });

    test('detectCollision() keeps capsule and circle contacts within contact slop', () => {
        const a = createCapsule(0, 0);
        const b = new RigidBody(new CircleShape(10), 20 + SETTINGS.contactSlop * 0.5, 0, 1.0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points).toHaveLength(1);
        expect(result?.penetrationDepth).toBe(0);
    });

    test('detectCollision() keeps capsule contacts within contact slop', () => {
        const a = createCapsule(0, 0);
        const b = createCapsule(20 + SETTINGS.contactSlop * 0.5, 0);

        const result = Collision.detectCollision(a, b);

        expect(result).not.toBeNull();
        expect(result?.points.length).toBeGreaterThan(0);
        expect(result?.penetrationDepth).toBe(0);
    });
});
