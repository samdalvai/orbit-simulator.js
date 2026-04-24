import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateFences, generateFloor } from './shared';

function setupPyramidOfBoxes(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const boxSize = 60;
    const boxSpacing = 10;
    const rows = 10;
    const centerX = 0;
    const baseY = 250;

    for (let row = 0; row < rows; row++) {
        const boxesInRow = rows - row;
        const rowWidth = boxesInRow * boxSize;

        for (let col = 0; col < boxesInRow; col++) {
            const x = centerX - rowWidth / 2 + boxSize / 2 + col * boxSize;
            const y = baseY - row * (boxSize + boxSpacing);
            const box = BodiesFactory.box({ width: boxSize, height: boxSize, x, y: -y, mass: 1, restitution: 0.001 });
            app.setBodyTexture(box, 'crate');
            world.addBody(box);
        }
    }
}

const pyramidOfBoxesDemo = defineDemo('A pyramid of boxes', setupPyramidOfBoxes);

export default pyramidOfBoxesDemo;
