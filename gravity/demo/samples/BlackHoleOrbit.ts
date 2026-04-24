import { BodiesFactory, CollisionCategory, GRAVITY, SETTINGS, Utils, Vec2 } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import Graphics from '../graphics/Graphics';
import { defineDemo } from './shared';

function setupBlackHoleOrbit(world: World, app: Application): void {
    // app.setBackground();
    Graphics.zoom = 0.4;

    const particleCount = 2_500;
    SETTINGS.applyGravity = false;

    const blackHole = BodiesFactory.circle({
        radius: 0.0001,
        x: 0,
        y: 0,
        mass: 600_000,
        collisionMask: CollisionCategory.NONE,
    });
    app.setBlackHole(blackHole);

    const particleRadius = 2.5;
    const particleMass = 0.02;
    const minOrbitRadius = 180;
    const maxOrbitRadius = 1000;
    const minGravityDistanceSquared = 80 * 80;
    const maxGravityDistanceSquared = 950 * 950;
    const particlePalette = ['#f8fbff', '#cdeeff', '#93dcff', '#ffe7a3'];

    for (let i = 0; i < particleCount; i++) {
        const orbitRadius = Math.sqrt(
            Utils.randomNumber(minOrbitRadius * minOrbitRadius, maxOrbitRadius * maxOrbitRadius),
        );
        const angle = Utils.randomNumber(0, Math.PI * 2);
        const radialDirection = new Vec2(Math.cos(angle), Math.sin(angle));
        const position = radialDirection.scaleNew(orbitRadius);
        const effectiveDistanceSquared = Utils.clamp(
            orbitRadius * orbitRadius,
            minGravityDistanceSquared,
            maxGravityDistanceSquared,
        );
        const orbitSpeed =
            Math.sqrt((GRAVITY * blackHole.mass * orbitRadius) / effectiveDistanceSquared) *
            Utils.randomNumber(0.9, 1.12);
        const tangentialVelocity = radialDirection.leftPerpNew().scaleNew(orbitSpeed);
        const radialVelocity = radialDirection.scaleNew(orbitSpeed * Utils.randomNumber(-0.18, 0.12));
        const velocity = tangentialVelocity.addNew(radialVelocity);
        const particle = BodiesFactory.circle({
            radius: particleRadius,
            x: position.x,
            y: position.y,
            mass: particleMass,
            velocity,
            restitution: 0,
            friction: 0,
        });

        app.setBodyFillColor(particle, particlePalette[Math.floor(Utils.randomNumber(0, particlePalette.length))]);
        world.addBody(particle);
    }
}

const blackHoleOrbitDemo = defineDemo('Black hole orbit', setupBlackHoleOrbit);

export default blackHoleOrbitDemo;
