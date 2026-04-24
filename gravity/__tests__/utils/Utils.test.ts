import { describe, expect, test } from '@jest/globals';
import { RigidBody } from '../../src/core/RigidBody';
import { CircleShape } from '../../src/shapes/CircleShape';
import * as Utils from '../../src/utils/Utils';

describe('Utils', () => {
    test('clamp() value below low returns low', () => {
        expect(Utils.clamp(0, 5, 10)).toBe(5);
        expect(Utils.clamp(-100, 0, 50)).toBe(0);
    });

    test('clamp() value above high returns high', () => {
        expect(Utils.clamp(20, 5, 10)).toBe(10);
        expect(Utils.clamp(999, -5, 5)).toBe(5);
    });

    test('clamp() value inside range returns unchanged', () => {
        expect(Utils.clamp(7, 5, 10)).toBe(7);
        expect(Utils.clamp(0, -5, 5)).toBe(0);
        expect(Utils.clamp(-2, -5, 5)).toBe(-2);
    });

    test('clamp() value equal to low returns low', () => {
        expect(Utils.clamp(5, 5, 10)).toBe(5);
    });

    test('clamp() value equal to high returns high', () => {
        expect(Utils.clamp(10, 5, 10)).toBe(10);
    });

    test('clamp() low equal to high returns that value', () => {
        expect(Utils.clamp(0, 3, 3)).toBe(3);
        expect(Utils.clamp(100, 3, 3)).toBe(3);
    });

    test('clamp() handles reversed bounds (low > high) by behaving like Math.min/max do naturally', () => {
        expect(Utils.clamp(5, 10, 3)).toBe(10);
        expect(Utils.clamp(100, 10, 3)).toBe(10);
        expect(Utils.clamp(-50, 10, 3)).toBe(10);
    });

    test('Bodies paur key should return the same value regardless of the ordering', () => {
        const a = new RigidBody(new CircleShape(10), 100, 100, 10);
        const b = new RigidBody(new CircleShape(10), 100, 100, 10);

        expect(Utils.pairKey(a, b)).toBe(Utils.pairKey(b, a));
    });
});
