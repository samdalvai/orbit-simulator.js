import { describe, expect, test } from '@jest/globals';

import { BodiesFactory, RigidBody, Vec2 } from '../../src';
import { generateBarnesHutGravitationalForce, generateGravitationalForce } from '../../src/force/Gravity';
import { generateBarnesHutCoulombForce, generateCoulombForce } from '../../src/force/Interactions';
import { buildQuadTree } from '../../src/force/QuadTree';

describe('BarnesHut', () => {
    test('Gravity matches the exact pairwise sum when theta is 0', () => {
        const bodies = [
            BodiesFactory.circle({ radius: 4, x: -50, y: -10, mass: 5 }),
            BodiesFactory.circle({ radius: 4, x: 40, y: 20, mass: 2 }),
            BodiesFactory.circle({ radius: 4, x: 10, y: -35, mass: 3 }),
            BodiesFactory.circle({ radius: 4, x: 65, y: 45, mass: 1 }),
        ];

        const G = 0.8;
        const minDistanceSquared = 25;
        const maxDistanceSquared = 250_000;

        const tree = buildQuadTree(bodies, 'gravity');
        const exact = bodies.map(body =>
            exactGravitationalForce(body, bodies, G, minDistanceSquared, maxDistanceSquared),
        );

        expect(tree?.bodyCount).toBe(bodies.length);

        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const force = generateBarnesHutGravitationalForce(b, tree, G, minDistanceSquared, maxDistanceSquared, 0);
            expect(force.x).toBeCloseTo(exact[i].x, 10);
            expect(force.y).toBeCloseTo(exact[i].y, 10);
        }
    });

    test('Gravity stays close to the exact force for distant clusters', () => {
        const bodies = [
            BodiesFactory.circle({ radius: 3, x: 0, y: 0, mass: 8 }),
            BodiesFactory.circle({ radius: 3, x: 195, y: 198, mass: 1 }),
            BodiesFactory.circle({ radius: 3, x: 205, y: 202, mass: 2 }),
            BodiesFactory.circle({ radius: 3, x: 198, y: 210, mass: 1.5 }),
            BodiesFactory.circle({ radius: 3, x: 212, y: 194, mass: 1.25 }),
            BodiesFactory.circle({ radius: 3, x: 188, y: 206, mass: 0.75 }),
        ];

        const G = 1.2;
        const minDistanceSquared = 25;
        const maxDistanceSquared = 500_000;
        const tree = buildQuadTree(bodies, 'gravity');

        const exact = exactGravitationalForce(bodies[0], bodies, G, minDistanceSquared, maxDistanceSquared);
        const barnesHut = generateBarnesHutGravitationalForce(
            bodies[0],
            tree,
            G,
            minDistanceSquared,
            maxDistanceSquared,
            0.9,
        );

        expectRelativeVectorError(barnesHut, exact, 0.05);
    });

    test('Coulomb matches the exact pairwise sum when theta is 0', () => {
        const bodies = [
            BodiesFactory.circle({ radius: 4, x: 0, y: 0, mass: 1, charge: 3 }),
            BodiesFactory.circle({ radius: 4, x: 50, y: 0, mass: 1, charge: 2 }),
            BodiesFactory.circle({ radius: 4, x: -30, y: 40, mass: 1, charge: -4 }),
            BodiesFactory.circle({ radius: 4, x: 10, y: -60, mass: 1, charge: 5 }),
            BodiesFactory.circle({ radius: 4, x: 80, y: 20, mass: 1, charge: -1 }),
            BodiesFactory.circle({ radius: 4, x: 5, y: 5, mass: 1, charge: 0 }),
        ];

        const k = 300;
        const tree = buildQuadTree(bodies, 'coulomb');
        const exact = bodies.map(body => exactCoulombForce(body, bodies, k));

        expect(tree?.bodyCount).toBe(5);

        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const force = generateBarnesHutCoulombForce(b, tree, k, 0);
            expect(force.x).toBeCloseTo(exact[i].x, 10);
            expect(force.y).toBeCloseTo(exact[i].y, 10);
        }
    });

    test('Coulomb stays close to the exact force for distant mixed-charge clusters', () => {
        const bodies = [
            BodiesFactory.circle({ radius: 3, x: 0, y: 0, mass: 1, charge: 6 }),
            BodiesFactory.circle({ radius: 3, x: 220, y: 210, mass: 1, charge: 2 }),
            BodiesFactory.circle({ radius: 3, x: 236, y: 198, mass: 1, charge: 3 }),
            BodiesFactory.circle({ radius: 3, x: 228, y: 222, mass: 1, charge: 1 }),
            BodiesFactory.circle({ radius: 3, x: -210, y: 205, mass: 1, charge: -2 }),
            BodiesFactory.circle({ radius: 3, x: -224, y: 214, mass: 1, charge: -3 }),
            BodiesFactory.circle({ radius: 3, x: -232, y: 196, mass: 1, charge: -1 }),
        ];

        const k = 500;
        const tree = buildQuadTree(bodies, 'coulomb');

        const exact = exactCoulombForce(bodies[0], bodies, k);
        const barnesHut = generateBarnesHutCoulombForce(bodies[0], tree, k, 0.9);

        expectRelativeVectorError(barnesHut, exact, 0.08);
    });
});

function exactGravitationalForce(
    body: RigidBody,
    bodies: readonly RigidBody[],
    G: number,
    minDistanceSquared: number,
    maxDistanceSquared: number,
): Vec2 {
    const total = new Vec2();

    for (let i = 0; i < bodies.length; i++) {
        const other = bodies[i];
        if (other.id === body.id) continue;
        total.addAssign(generateGravitationalForce(body, other, G, minDistanceSquared, maxDistanceSquared));
    }

    return total;
}

function exactCoulombForce(body: RigidBody, bodies: readonly RigidBody[], k: number): Vec2 {
    const total = new Vec2();

    for (let i = 0; i < bodies.length; i++) {
        const other = bodies[i];
        if (other.id === body.id) continue;
        total.addAssign(generateCoulombForce(body, other, k));
    }

    return total;
}

function expectRelativeVectorError(actual: Vec2, expected: Vec2, maxRelativeError: number): void {
    const dx = actual.x - expected.x;
    const dy = actual.y - expected.y;
    const errorMagnitude = Math.sqrt(dx * dx + dy * dy);
    const expectedMagnitude = Math.sqrt(expected.x * expected.x + expected.y * expected.y);
    const relativeError = errorMagnitude / expectedMagnitude;

    expect(relativeError).toBeLessThanOrEqual(maxRelativeError);
}
