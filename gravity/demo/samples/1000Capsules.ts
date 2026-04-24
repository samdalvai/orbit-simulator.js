import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateSquareCage, populateStressDemo } from './shared';

function setup1000Capsules(world: World, app: Application): void {
    app.setBackground('darkBackground');
    const cage = generateSquareCage(world, app);

    populateStressDemo(world, cage, (x, y) => {
        const body = BodiesFactory.capsule({ halfHeight: 6, radius: 6, x, y, mass: 1 });
        app.setBodyFillColor(body, '#b8f2e6');
        return body;
    });
}

const thousandCapsulesDemo = defineDemo('1000 capsules', setup1000Capsules);

export default thousandCapsulesDemo;
