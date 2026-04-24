import { BodiesFactory, SETTINGS, Utils, Vec2 } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import Graphics from '../graphics/Graphics';
import { defineDemo } from './shared';

const RADIUS = 3_500;

function setupElectroStaticForce(world: World, app: Application): void {
    SETTINGS.applyGravity = false;
    Graphics.zoom = 0.35;

    const numOfParticles = 2500;
    const center = new Vec2();

    for (let i = 0; i < numOfParticles; i++) {
        const charge = Utils.randomNumber(-100, 100);
        const radius = Math.max(Math.abs(charge) / 5, 5);
        const mass = radius / 10;
        const pos = randomPointInRadius(center, RADIUS);
        const particle = BodiesFactory.circle({
            radius: radius,
            x: pos.x,
            y: pos.y,
            mass: mass,
            charge: charge,
        });

        if (particle.charge > 0) {
            app.setBodyFillColor(particle, 'red');
        } else if (particle.charge < 0) {
            app.setBodyFillColor(particle, 'blue');
        } else {
            app.setBodyFillColor(particle, 'white');
        }
        world.addBody(particle);
    }

    app.setCoulombForce(true);
}

function randomPointInRadius(center: Vec2, radius: number): Vec2 {
    const u = Math.random();
    const v = Math.random();

    const r = radius * Math.sqrt(u);
    const theta = 2 * Math.PI * v;

    return new Vec2(center.x + Math.cos(theta) * r, center.y + Math.sin(theta) * r);
}

const electroStaticDemo = defineDemo('Electrostatic force', setupElectroStaticForce);

export default electroStaticDemo;
