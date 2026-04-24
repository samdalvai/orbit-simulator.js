import { describe, expect, test } from '@jest/globals';

import { BoxShape } from '../../src';
import { RigidBody } from '../../src/core/RigidBody';
import { Vec2 } from '../../src/math/Vec2';
import { CircleShape } from '../../src/shapes/CircleShape';

describe('RigidBody', () => {
    test('Two bodies created should have a different id', () => {
        const a = new RigidBody(new CircleShape(10), 100, 100, 10);
        const b = new RigidBody(new CircleShape(10), 100, 100, 10);

        expect(a.id).toBe(0);
        expect(b.id).toBe(1);
    });

    test('Should convert local RigidBody point to world space', () => {
        const a = new RigidBody(new CircleShape(10), 100, 100, 10);

        const world = a.localPointToWorld(new Vec2(10, 10));
        expect(world.x).toBe(110);
        expect(world.y).toBe(110);
    });

    test('Should convert world point to RigidBody local space', () => {
        const a = new RigidBody(new CircleShape(10), 100, 100, 10);

        const local = a.worldPointToLocal(new Vec2(110, 110));
        expect(local.x).toBe(10);
        expect(local.y).toBe(10);
    });

    test('Box rigid body declared by mass or density should have the same mass properties', () => {
        const boxWidth = 10;
        const boxArea = boxWidth * boxWidth;
        const boxMass = 10;

        const a = new RigidBody(new BoxShape(boxWidth, boxWidth), 100, 100, boxMass);
        const b = new RigidBody(new BoxShape(boxWidth, boxWidth), 100, 100, undefined, boxMass / boxArea);

        expect(a.mass).toBe(b.mass);
        expect(a.density).toBe(b.density);
    });

    test('Circle rigid body declared by mass or density should have the same mass properties', () => {
        const circleArea = Math.PI * 10 * 10;
        const circleMass = 10;

        const a = new RigidBody(new CircleShape(10), 100, 100, circleMass);
        const b = new RigidBody(new CircleShape(10), 100, 100, undefined, circleMass / circleArea);

        expect(a.mass).toBe(b.mass);
        expect(a.density).toBe(b.density);
    });

    test('Rigid body declared with no mass or density properties should throw error', () => {
        expect(() => new RigidBody(new BoxShape(10, 10), 100, 100, undefined, undefined)).toThrow();
    });
});
