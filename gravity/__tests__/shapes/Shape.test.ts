import { describe, expect, test } from '@jest/globals';
import { Vec2 } from '../../src/math/Vec2';
import { BoxShape } from '../../src/shapes/BoxShape';
import { PolygonShape } from '../../src/shapes/PolygonShape';

describe('Shape', () => {
    test('Should rotate box world vertices by 90 degrees', () => {
        const box = new BoxShape(20, 20);

        expect(box.worldVertices[0].x).toBe(-10);
        expect(box.worldVertices[0].y).toBe(-10);
        expect(box.worldVertices[1].x).toBe(10);
        expect(box.worldVertices[1].y).toBe(-10);
        expect(box.worldVertices[2].x).toBe(10);
        expect(box.worldVertices[2].y).toBe(10);
        expect(box.worldVertices[3].x).toBe(-10);
        expect(box.worldVertices[3].y).toBe(10);

        box.updateVertices((90 * Math.PI) / 180, new Vec2(0, 0));

        expect(box.worldVertices[0].x).toBe(10);
        expect(box.worldVertices[0].y).toBe(-10);
        expect(box.worldVertices[1].x).toBe(10);
        expect(box.worldVertices[1].y).toBe(10);
        expect(box.worldVertices[2].x).toBe(-10);
        expect(box.worldVertices[2].y).toBe(10);
        expect(box.worldVertices[3].x).toBe(-10);
        expect(box.worldVertices[3].y).toBe(-10);
    });

    test('Should translate box world vertices without rotating it', () => {
        const box = new BoxShape(20, 20);

        expect(box.worldVertices[0].x).toBe(-10);
        expect(box.worldVertices[0].y).toBe(-10);
        expect(box.worldVertices[1].x).toBe(10);
        expect(box.worldVertices[1].y).toBe(-10);
        expect(box.worldVertices[2].x).toBe(10);
        expect(box.worldVertices[2].y).toBe(10);
        expect(box.worldVertices[3].x).toBe(-10);
        expect(box.worldVertices[3].y).toBe(10);

        box.updateVertices(0, new Vec2(100, 100));

        expect(box.worldVertices[0].x).toBe(90);
        expect(box.worldVertices[0].y).toBe(90);
        expect(box.worldVertices[1].x).toBe(110);
        expect(box.worldVertices[1].y).toBe(90);
        expect(box.worldVertices[2].x).toBe(110);
        expect(box.worldVertices[2].y).toBe(110);
        expect(box.worldVertices[3].x).toBe(90);
        expect(box.worldVertices[3].y).toBe(110);
    });

    test('Should translate box world vertices and rotate by 90 degrees', () => {
        const box = new BoxShape(20, 20);

        expect(box.worldVertices[0].x).toBe(-10);
        expect(box.worldVertices[0].y).toBe(-10);
        expect(box.worldVertices[1].x).toBe(10);
        expect(box.worldVertices[1].y).toBe(-10);
        expect(box.worldVertices[2].x).toBe(10);
        expect(box.worldVertices[2].y).toBe(10);
        expect(box.worldVertices[3].x).toBe(-10);
        expect(box.worldVertices[3].y).toBe(10);

        box.updateVertices((90 * Math.PI) / 180, new Vec2(100, 100));

        expect(box.worldVertices[0].x).toBe(110);
        expect(box.worldVertices[0].y).toBe(90);
        expect(box.worldVertices[1].x).toBe(110);
        expect(box.worldVertices[1].y).toBe(110);
        expect(box.worldVertices[2].x).toBe(90);
        expect(box.worldVertices[2].y).toBe(110);
        expect(box.worldVertices[3].x).toBe(90);
        expect(box.worldVertices[3].y).toBe(90);
    });

    test('PolygonShape normalizes clockwise vertices to counter-clockwise winding', () => {
        const clockwisePentagon = [
            new Vec2(0, 46),
            new Vec2(42, 14),
            new Vec2(26, -38),
            new Vec2(-26, -38),
            new Vec2(-42, 14),
        ];

        const polygon = new PolygonShape(clockwisePentagon);
        const area = polygon.localVertices.reduce((sum, current, index) => {
            const next = polygon.localVertices[(index + 1) % polygon.localVertices.length];
            return sum + current.cross(next);
        }, 0);

        expect(area).toBeGreaterThan(0);
    });
});
