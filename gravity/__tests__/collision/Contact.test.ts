import { describe, expect, test } from '@jest/globals';

import * as Collision from '../../src/collision/NarrowPhase';
import { RigidBody } from '../../src/core/RigidBody';
import { CircleShape } from '../../src/shapes/CircleShape';

describe('Contact', () => {
    test('Contact constraint solving should apply impulses to correct position of bodies', () => {
        const a = new RigidBody(new CircleShape(60), 100, 100, 5);
        const b = new RigidBody(new CircleShape(60), 200, 100, 5);

        // Move bodies apart
        const numFrames = 60;
        const solverIterations = 20;

        const manifold = Collision.detectCollision(a, b)!;

        const deltaTime = 1 / 60;
        for (let i = 0; i < numFrames; i++) {
            manifold.preSolve(1 / deltaTime);

            for (let j = 0; j < solverIterations; j++) {
                manifold.solve();
            }
        }

        a.integrateVelocities(deltaTime);
        b.integrateVelocities(deltaTime);

        expect(a.position.y).toBe(100);
        expect(b.position.y).toBe(100);

        // Check that the solver moved the objects apart
        expect(a.position.x).toBe(98.05);
        expect(b.position.x).toBe(201.95);
        expect(a.velocity.x).toBe(-117);
        expect(b.velocity.x).toBe(117);
    });
});
