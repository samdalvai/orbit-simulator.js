import { BodiesFactory, Vec2 } from '../../src';
import type { World } from '../../src';
import Graphics from '../graphics/Graphics';
import type Application from '../Application';
import { defineDemo, generateFences, generateFloor } from './shared';

function setupContinuousCollisionDetection(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const fallingBox = BodiesFactory.box({
        width: 50,
        height: 50,
        x: 500,
        y: 200,
        mass: 1,
        velocity: new Vec2(0, -2_350),
    });
    world.addBody(fallingBox);

    const bullet = BodiesFactory.circle({
        radius: 5,
        x: -1000,
        y: 0,
        mass: 1,
        isBullet: true,
        velocity: new Vec2(20_000, 0),
    });
    world.addBody(bullet);

    Graphics.zoom = 0.35;
}

const continuousCollisionDetectionDemo = defineDemo(
    'Continuous collision detection',
    setupContinuousCollisionDetection,
);

export default continuousCollisionDetectionDemo;
