import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateFences, generateFloor } from './shared';

function setupSingleBox(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const body = BodiesFactory.box({ width: 60, height: 60, x: 0, y: 0, mass: 1, angularVelocity: 2, rotation: 0.7 });
    app.setBodyTexture(body, 'crate');
    world.addBody(body);
}

const singleBoxDemo = defineDemo('A single box', setupSingleBox);

export default singleBoxDemo;
