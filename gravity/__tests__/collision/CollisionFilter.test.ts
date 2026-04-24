import { describe, expect, test } from '@jest/globals';

import { BodiesFactory } from '../../src';
import { CollisionCategory, canCollide } from '../../src/collision/CollisionFilter';

describe('CollisionFilter', () => {
    test('BodiesFactory.circle uses the default collision filter when none is provided', () => {
        const body = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
        });

        expect(body.collisionCategory).toBe(CollisionCategory.DEFAULT);
        expect(body.collisionMask).toBe(CollisionCategory.ALL);
    });

    test('Filters with DEFAULT settings collide with each other', () => {
        const a = BodiesFactory.circle({ radius: 30, x: 0, y: 0, mass: 1 });
        const b = BodiesFactory.circle({ radius: 30, x: 0, y: 0, mass: 1 });
        expect(canCollide(a, b)).toBe(true);
        expect(canCollide(b, a)).toBe(true);
    });

    test('A NONE mask blocks collisions even when categories would otherwise match', () => {
        const a = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.DEFAULT,
            collisionMask: CollisionCategory.NONE,
        });

        const b = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PROJECTILE,
            collisionMask: CollisionCategory.ALL,
        });
        expect(canCollide(a, b)).toBe(false);
        expect(canCollide(b, a)).toBe(false);
    });

    test('Both filters must allow each other for a collision to happen', () => {
        const a = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.DEFAULT,
            collisionMask: CollisionCategory.PROJECTILE,
        });

        const b = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PROJECTILE,
            collisionMask: CollisionCategory.PARTICLE,
        });
        expect(canCollide(a, b)).toBe(false);
        expect(canCollide(b, a)).toBe(false);
    });

    test('A filter can allow exactly one category', () => {
        const a = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.DEFAULT,
            collisionMask: CollisionCategory.PROJECTILE,
        });

        const projectile = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PROJECTILE,
            collisionMask: CollisionCategory.DEFAULT,
        });

        const particle = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PARTICLE,
            collisionMask: CollisionCategory.DEFAULT,
        });
        expect(canCollide(a, projectile)).toBe(true);
        expect(canCollide(projectile, a)).toBe(true);
        expect(canCollide(a, particle)).toBe(false);
        expect(canCollide(particle, a)).toBe(false);
    });

    test('A mask can allow a union of categories', () => {
        const a = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.SENSOR,
            collisionMask: CollisionCategory.DEFAULT | CollisionCategory.PROJECTILE,
        });

        const defaultBody = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.DEFAULT,
            collisionMask: CollisionCategory.SENSOR,
        });

        const projectile = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PROJECTILE,
            collisionMask: CollisionCategory.SENSOR,
        });

        const particle = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PARTICLE,
            collisionMask: CollisionCategory.SENSOR,
        });
        expect(canCollide(a, defaultBody)).toBe(true);
        expect(canCollide(defaultBody, a)).toBe(true);
        expect(canCollide(a, projectile)).toBe(true);
        expect(canCollide(projectile, a)).toBe(true);
        expect(canCollide(a, particle)).toBe(false);
        expect(canCollide(particle, a)).toBe(false);
    });

    test('Removing DEFAULT from ALL blocks DEFAULT but still allows other categories', () => {
        const particle = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PARTICLE,
            collisionMask: CollisionCategory.ALL & ~CollisionCategory.DEFAULT,
        });

        const defaultBody = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.DEFAULT,
            collisionMask: CollisionCategory.ALL,
        });

        const sensor = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.SENSOR,
            collisionMask: CollisionCategory.ALL,
        });
        expect(canCollide(particle, defaultBody)).toBe(false);
        expect(canCollide(defaultBody, particle)).toBe(false);
        expect(canCollide(particle, sensor)).toBe(true);
        expect(canCollide(sensor, particle)).toBe(true);
    });

    test('A body does not collide with its own category when its mask excludes it', () => {
        const a = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PARTICLE,
            collisionMask: CollisionCategory.ALL & ~CollisionCategory.PARTICLE,
        });

        const b = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.PARTICLE,
            collisionMask: CollisionCategory.PARTICLE,
        });
        expect(canCollide(a, b)).toBe(false);
        expect(canCollide(b, a)).toBe(false);
    });

    test('A NONE category never matches another body mask', () => {
        const a = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.NONE,
            collisionMask: CollisionCategory.ALL,
        });

        const b = BodiesFactory.circle({
            radius: 30,
            x: 0,
            y: 0,
            mass: 1,
            collisionCategory: CollisionCategory.DEFAULT,
            collisionMask: CollisionCategory.ALL,
        });
        expect(canCollide(a, b)).toBe(false);
        expect(canCollide(b, a)).toBe(false);
    });
});
