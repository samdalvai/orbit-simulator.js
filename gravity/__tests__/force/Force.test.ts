import { describe, expect, test } from '@jest/globals';

import { BodiesFactory, FIXED_DELTA_TIME, Force, Vec2 } from '../../src';

describe('Force', () => {
    test('Buoyancy scales with the body shape area when fully submerged', () => {
        const body = BodiesFactory.circle({
            radius: 10,
            x: 0,
            y: 0,
            mass: 1,
        });

        const buoyancy = Force.buoyancy.generateBuoyancyForce(body, 20, 0.5, 10);
        const expectedArea = Math.PI * 10 * 10;

        if (!buoyancy) {
            throw new Error('Expected circle to be fully submerged');
        }

        expect(buoyancy.submergedArea).toBeCloseTo(expectedArea);
        expect(buoyancy.force.x).toBe(0);
        expect(buoyancy.force.y).toBeCloseTo(expectedArea * 0.5 * 10);
        expect(buoyancy.applicationPoint.x).toBe(0);
        expect(buoyancy.applicationPoint.y).toBe(0);
    });

    test('Water drag is clamped so it cannot reverse velocity in one step', () => {
        const body = BodiesFactory.circle({
            radius: 5,
            x: 0,
            y: 0,
            mass: 0.01,
            velocity: new Vec2(0, -100),
        });

        const submergedArea = body.shape.getArea();
        const waterDrag = Force.buoyancy.generateLinearWaterDragForce(body, submergedArea, 1, 0.2, FIXED_DELTA_TIME);
        const maxForce = (body.mass * body.velocity.magnitude()) / FIXED_DELTA_TIME;

        expect(waterDrag.x).toBeCloseTo(0);
        expect(waterDrag.y).toBeCloseTo(maxForce);
    });

    test('Angular water drag scales with submerged area and moment of inertia', () => {
        const body = BodiesFactory.box({
            width: 40,
            height: 20,
            x: 0,
            y: 0,
            mass: 2,
        });
        body.angularVelocity = 3;

        const submergedArea = 20;
        const submergedFraction = submergedArea / body.shape.getArea();
        const torque = Force.buoyancy.generateAngularWaterDragTorque(body, submergedArea, 1, 0.75);

        expect(torque).toBeCloseTo(-body.angularVelocity * 0.75 * submergedFraction * body.I);
    });
});
