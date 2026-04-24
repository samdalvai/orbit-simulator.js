import { BodiesFactory } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import {
    JOINT_TUNING,
    createDistanceJoint,
    defineDemo,
    generateFences,
    generateFloor,
} from './shared';

function setupStressTest(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const tuning = JOINT_TUNING.stressBridge;
    const numSteps = 10;
    const stepWidth = 40;
    const spacing = stepWidth + 2.5;
    const startX = -(numSteps * spacing) / 2 - stepWidth / 2;
    const startY = 0;

    const startAnchor = BodiesFactory.box({
        width: stepWidth * 2,
        height: stepWidth * 0.5,
        x: startX - stepWidth / 2,
        y: startY,
        mass: 0.0,
    });
    app.setBodyTexture(startAnchor, 'rockBridgeAnchor');
    world.addBody(startAnchor);

    let lastStep = startAnchor;

    for (let i = 1; i <= numSteps; i++) {
        const x = startX + i * spacing;
        const y = startY - Math.sin((i / numSteps) * Math.PI) * 10;
        const step = BodiesFactory.circle({ radius: stepWidth * 0.5, x, y, mass: 3 });
        app.setBodyTexture(step, 'woodBridgeStep');
        world.addBody(step);
        world.addJoint(createDistanceJoint(lastStep, step, tuning));
        lastStep = step;
    }

    const endAnchor = BodiesFactory.box({
        width: stepWidth * 2,
        height: stepWidth * 0.5,
        x: lastStep.position.x + spacing + stepWidth / 2,
        y: startY,
        mass: 0.0,
    });
    app.setBodyTexture(endAnchor, 'rockBridgeAnchor');
    world.addBody(endAnchor);
    world.addJoint(createDistanceJoint(lastStep, endAnchor, tuning));

    const boxSizeLarge = 40;
    const numBoxLargeHorizontal = 10;

    for (let i = 0; i < numBoxLargeHorizontal; i++) {
        for (let j = 0; j < 10; j++) {
            const box = BodiesFactory.box({
                width: boxSizeLarge,
                height: boxSizeLarge,
                x: -(numBoxLargeHorizontal * boxSizeLarge) / 2 + boxSizeLarge / 2 + i * boxSizeLarge,
                y: 500 + j * boxSizeLarge,
                mass: 1,
            });
            app.setBodyTexture(box, 'woodBox');
            world.addBody(box);
        }
    }

    const boxSizeSmall = 20;
    const numBoxSmallHorizontal = 20;

    for (let i = 0; i < numBoxSmallHorizontal; i++) {
        for (let j = 0; j < 10; j++) {
            const box = BodiesFactory.box({
                width: boxSizeSmall,
                height: boxSizeSmall,
                x: -(numBoxSmallHorizontal * boxSizeSmall) / 2 + boxSizeSmall / 2 + i * boxSizeSmall,
                y: 2000 + j * boxSizeSmall,
                mass: 1,
            });
            app.setBodyTexture(box, 'metal');
            world.addBody(box);
        }
    }
}

const stressTestDemo = defineDemo('Stress test', setupStressTest);

export default stressTestDemo;
