import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateSquareCage, populateStressDemo } from './shared';

function setup1000Boxes(world: World, app: Application): void {
    app.setBackground('darkBackground');
    const cage = generateSquareCage(world, app);

    populateStressDemo(world, cage, (x, y) => {
        const body = BodiesFactory.box({ width: 18, height: 18, x, y, mass: 1 });
        app.setBodyFillColor(body, '#f4a261');
        return body;
    });
}

const thousandBoxesDemo = defineDemo('1000 boxes', setup1000Boxes);

export default thousandBoxesDemo;
