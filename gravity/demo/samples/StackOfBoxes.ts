import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateFences, generateFloor } from './shared';

function setupStackOfBoxes(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const numOfBoxes = 10;
    const boxSize = 60;
    const boxSpacing = 10;

    for (let i = 0; i < numOfBoxes; i++) {
        const box = BodiesFactory.box({
            width: boxSize,
            height: boxSize,
            x: 0,
            y: -200 + (boxSize + boxSpacing) * i,
            mass: 1,
            restitution: 0,
        });
        app.setBodyTexture(box, 'crate');
        world.addBody(box);
    }
}

const stackOfBoxesDemo = defineDemo('A stack of boxes', setupStackOfBoxes);

export default stackOfBoxesDemo;
