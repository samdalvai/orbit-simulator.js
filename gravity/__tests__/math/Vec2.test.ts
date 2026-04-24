import { describe, expect, test } from '@jest/globals';
import { Vec2 } from '../../src/math/Vec2';

describe('Vec2', () => {
    test('constructor initializes values', () => {
        const v = new Vec2(3, 4);
        expect(v.x).toBe(3);
        expect(v.y).toBe(4);
    });

    test('constructor defaults to 0,0', () => {
        const v = new Vec2();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });

    test('add() adds vector values', () => {
        const v = new Vec2(1, 2);
        v.add(new Vec2(3, 4));
        expect(v.x).toBe(4);
        expect(v.y).toBe(6);
    });

    test('sub() subtracts vector values', () => {
        const v = new Vec2(5, 5);
        v.sub(new Vec2(2, 3));
        expect(v.x).toBe(3);
        expect(v.y).toBe(2);
    });

    test('scale() multiplies vector components', () => {
        const v = new Vec2(2, 3);
        v.scale(2);
        expect(v.x).toBe(4);
        expect(v.y).toBe(6);
    });

    test('rotate() rotates vector correctly (90 degrees)', () => {
        const v = new Vec2(1, 0);
        const result = v.rotate(Math.PI / 2);
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(1);
    });

    test('magnitude() returns correct length', () => {
        const v = new Vec2(3, 4);
        expect(v.magnitude()).toBe(5);
    });

    test('magnitudeSquared() returns correct squared length', () => {
        const v = new Vec2(3, 4);
        expect(v.magnitudeSquared()).toBe(25);
    });

    test('normalize() normalizes the vector', () => {
        const v = new Vec2(3, 4);
        v.normalize();
        expect(v.magnitude()).toBeCloseTo(1);
        expect(v.x).toBeCloseTo(3 / 5);
        expect(v.y).toBeCloseTo(4 / 5);
    });

    test('normalize() leaves zero vector unchanged', () => {
        const v = new Vec2(0, 0);
        v.normalize();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });

    test('unitVector() returns a new normalized vector', () => {
        const v = new Vec2(3, 4);
        const u = v.unitVector();
        expect(u.magnitude()).toBeCloseTo(1);
        expect(u.x).toBeCloseTo(3 / 5);
        expect(u.y).toBeCloseTo(4 / 5);
        expect(u).not.toBe(v);
    });

    test('normal() returns a perpendicular unit vector', () => {
        const v = new Vec2(10, 0);
        const n = v.normal();
        expect(n.x).toBe(0);
        expect(n.y).toBe(-1);
    });

    test('dot() computes dot product', () => {
        const v1 = new Vec2(1, 3);
        const v2 = new Vec2(2, 4);
        expect(v1.dot(v2)).toBe(1 * 2 + 3 * 4);
    });

    test('cross() computes scalar cross product', () => {
        const v1 = new Vec2(1, 3);
        const v2 = new Vec2(2, 4);
        expect(v1.cross(v2)).toBe(1 * 4 - 3 * 2);
    });

    test('assign() should assign new values to a vector', () => {
        const v1 = new Vec2(1, 3);
        const v2 = new Vec2(2, 4);
        v1.assign(v2);
        expect(v1.x).toBe(2);
        expect(v1.y).toBe(4);
    });

    test('equals() and notEquals() work correctly', () => {
        const v1 = new Vec2(1, 2);
        const v2 = new Vec2(1, 2);
        const v3 = new Vec2(2, 3);
        expect(v1.equals(v2)).toBe(true);
        expect(v1.notEquals(v3)).toBe(true);
    });

    test('addNew() returns new vector sum', () => {
        const v1 = new Vec2(1, 2);
        const v2 = new Vec2(3, 4);
        const result = v1.addNew(v2);
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
        expect(result).not.toBe(v1);
    });

    test('subNew() returns new vector difference', () => {
        const v1 = new Vec2(5, 5);
        const v2 = new Vec2(2, 3);
        const result = v1.subNew(v2);
        expect(result.x).toBe(3);
        expect(result.y).toBe(2);
    });

    test('scaleNew() returns scaled vector', () => {
        const v = new Vec2(2, 3);
        const result = v.scaleNew(2);
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
    });

    test('divNew() returns divided vector', () => {
        const v = new Vec2(4, 6);
        const result = v.divNew(2);
        expect(result.x).toBe(2);
        expect(result.y).toBe(3);
    });

    test('addAssign() mutates vector correctly', () => {
        const v1 = new Vec2(1, 2);
        const v2 = new Vec2(3, 4);
        v1.addAssign(v2);
        expect(v1.x).toBe(4);
        expect(v1.y).toBe(6);
    });

    test('subAssign() mutates vector correctly', () => {
        const v1 = new Vec2(5, 5);
        const v2 = new Vec2(2, 3);
        v1.subAssign(v2);
        expect(v1.x).toBe(3);
        expect(v1.y).toBe(2);
    });

    test('scaleAssign() mutates vector correctly', () => {
        const v = new Vec2(2, 3);
        v.scaleAssign(2);
        expect(v.x).toBe(4);
        expect(v.y).toBe(6);
    });

    test('divAssign() mutates vector correctly', () => {
        const v = new Vec2(4, 6);
        v.divAssign(2);
        expect(v.x).toBe(2);
        expect(v.y).toBe(3);
    });

    test('negate() invertes vector in place', () => {
        const v = new Vec2(3, -4);
        v.negate();
        expect(v.x).toBe(-3);
        expect(v.y).toBe(4);
    });

    test('negated() returns vector with inverted signs', () => {
        const v = new Vec2(3, -4);
        const result = v.negateNew();
        expect(v.x).toBe(3);
        expect(v.y).toBe(-4);
        expect(result.x).toBe(-3);
        expect(result.y).toBe(4);
    });
});
