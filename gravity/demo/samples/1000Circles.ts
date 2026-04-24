import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateSquareCage, populateStressDemo } from './shared';

function setup1000Circles(world: World, app: Application): void {
    app.setBackground('darkBackground');
    const cage = generateSquareCage(world, app);

    populateStressDemo(world, cage, (x, y) => {
        const body = BodiesFactory.circle({ radius: 10, x, y, mass: 1 });
        app.setBodyFillColor(body, '#7bdff2');
        return body;
    });
}

const thousandCirclesDemo = defineDemo('1000 circles', setup1000Circles);

export default thousandCirclesDemo;
