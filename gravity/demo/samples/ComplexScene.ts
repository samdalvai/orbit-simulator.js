import { BodiesFactory, Vec2 } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import {
    FLOOR_HEIGHT,
    JOINT_TUNING,
    createDistanceJoint,
    defineDemo,
    generateFences,
    generateFloor,
} from './shared';

function setupComplexScene(world: World, app: Application): void {
    app.setBackground('background');
    const floor = generateFloor(world, app);
    generateFences(world, app);

    const bird = BodiesFactory.circle({ radius: 45, x: -550, y: -200, mass: 3.0 });
    app.setBodyTexture(bird, 'birdRed');
    world.addBody(bird);

    for (let i = 1; i <= 4; i++) {
        const mass = 10.0 / i;
        const box = BodiesFactory.box({
            width: 50,
            height: 50,
            x: -300,
            y: floor.position.y + FLOOR_HEIGHT / 2 + i * 55,
            mass,
            friction: 0.9,
            restitution: 0.1,
        });
        app.setBodyTexture(box, 'woodBox');
        world.addBody(box);
    }

    const plank1 = BodiesFactory.box({
        width: 50,
        height: 150,
        x: -30,
        y: floor.position.y + FLOOR_HEIGHT / 2 + 100,
        mass: 5.0,
    });
    const plank2 = BodiesFactory.box({
        width: 50,
        height: 150,
        x: 130,
        y: floor.position.y + FLOOR_HEIGHT / 2 + 100,
        mass: 5.0,
    });
    const plank3 = BodiesFactory.box({
        width: 250,
        height: 25,
        x: 50,
        y: floor.position.y + FLOOR_HEIGHT / 2 + 200,
        mass: 2.0,
    });
    app.setBodyTexture(plank1, 'woodPlankSolid');
    app.setBodyTexture(plank2, 'woodPlankSolid');
    app.setBodyTexture(plank3, 'woodPlankCracked');
    world.addBody(plank1);
    world.addBody(plank2);
    world.addBody(plank3);

    const triangleVertices = [new Vec2(-30, -30), new Vec2(30, -30), new Vec2(0, 30)];
    const triangle = BodiesFactory.polygon({
        vertices: triangleVertices,
        x: plank3.position.x,
        y: plank3.position.y + 50,
        mass: 0.5,
    });
    app.setBodyTexture(triangle, 'woodTriangle');
    world.addBody(triangle);

    const numRows = 5;
    for (let col = 0; col < numRows; col++) {
        for (let row = 0; row < col; row++) {
            const x = plank3.position.x + 200 + col * 50 - row * 25;
            const y = floor.position.y + FLOOR_HEIGHT / 2 + 50 + row * 52;
            const mass = 5 / (row + 1);
            const box = BodiesFactory.box({ width: 50, height: 50, x, y, mass, friction: 0.9, restitution: 0.0 });
            app.setBodyTexture(box, 'woodBox');
            world.addBody(box);
        }
    }

    const bridgeTuning = JOINT_TUNING.stressBridge;
    const numSteps = 10;
    const spacing = 33;
    const stepHeight = 20;
    const startStep = BodiesFactory.box({ width: 80, height: stepHeight, x: -500, y: 200, mass: 0.0 });
    app.setBodyTexture(startStep, 'rockBridgeAnchor');
    world.addBody(startStep);

    let last = startStep;

    for (let i = 1; i <= numSteps; i++) {
        const x = startStep.position.x + 30 + i * spacing;
        const y = startStep.position.y - Math.sin((i / numSteps) * Math.PI) * 10;
        const step = BodiesFactory.circle({ radius: 15, x, y, mass: 3 });
        app.setBodyTexture(step, 'woodBridgeStep');
        world.addBody(step);
        world.addJoint(createDistanceJoint(last, step, bridgeTuning));
        last = step;
    }

    const endStep = BodiesFactory.box({
        width: 80,
        height: stepHeight,
        x: last.position.x + 60,
        y: startStep.position.y,
        mass: 0.0,
    });
    app.setBodyTexture(endStep, 'rockBridgeAnchor');
    world.addBody(endStep);
    world.addJoint(createDistanceJoint(last, endStep, bridgeTuning));

    const pigRadius = 30;
    const pig1 = BodiesFactory.circle({
        radius: pigRadius,
        x: plank1.position.x + 80,
        y: floor.position.y + FLOOR_HEIGHT / 2 + pigRadius,
        mass: 3.0,
    });
    const pig2 = BodiesFactory.circle({
        radius: pigRadius,
        x: plank2.position.x + 400,
        y: floor.position.y + FLOOR_HEIGHT / 2 + pigRadius,
        mass: 3.0,
    });
    const pig3 = BodiesFactory.circle({
        radius: pigRadius,
        x: plank2.position.x + 460,
        y: floor.position.y + FLOOR_HEIGHT / 2 + pigRadius,
        mass: 3.0,
    });
    const pig4 = BodiesFactory.circle({
        radius: pigRadius,
        x: startStep.position.x,
        y: startStep.position.y + stepHeight / 2 + pigRadius,
        mass: 1.0,
    });
    app.setBodyTexture(pig1, 'pig1');
    app.setBodyTexture(pig2, 'pig2');
    app.setBodyTexture(pig3, 'pig1');
    app.setBodyTexture(pig4, 'pig2');
    world.addBody(pig1);
    world.addBody(pig2);
    world.addBody(pig3);
    world.addBody(pig4);
}

const complexSceneDemo = defineDemo('A complex scene', setupComplexScene);

export default complexSceneDemo;
