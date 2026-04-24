import { BodiesFactory, Vec2 } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import Graphics from '../graphics/Graphics';
import { JOINT_TUNING, createDistanceJoint, defineDemo, generateFences, generateFloor } from './shared';

function setupPlank(world: World, app: Application): void {
    app.setBackground('background');
    const floor = generateFloor(world, app);
    generateFences(world, app);

    const plank = BodiesFactory.box({ width: 750, height: 20, x: 0, y: floor.position.y + 100, mass: 10 });
    app.setBodyTexture(plank, 'woodPlankCracked');
    world.addBody(plank);
    world.addJoint(createDistanceJoint(floor, plank, JOINT_TUNING.plank, plank.position, plank.position));

    const triangleVertices = [new Vec2(-30, -30), new Vec2(30, -30), new Vec2(0, 33.5)];
    const triangle = BodiesFactory.polygon({ vertices: triangleVertices, x: 0, y: floor.position.y + 55, mass: 0 });
    app.setBodyTexture(triangle, 'woodTriangle');
    world.addBody(triangle);

    const box1 = BodiesFactory.box({
        width: 25,
        height: 25,
        x: plank.position.x - 350,
        y: plank.position.y + 25,
        mass: 1,
    });
    const box2 = BodiesFactory.box({
        width: 25,
        height: 25,
        x: plank.position.x - 325,
        y: plank.position.y + 25,
        mass: 1,
    });
    const box3 = BodiesFactory.box({
        width: 25,
        height: 25,
        x: plank.position.x - 337.5,
        y: plank.position.y + 50,
        mass: 1,
    });
    app.setBodyTexture(box1, 'crate');
    app.setBodyTexture(box2, 'crate');
    app.setBodyTexture(box3, 'crate');
    world.addBody(box1);
    world.addBody(box2);
    world.addBody(box3);

    const heavyBox = BodiesFactory.box({
        width: 50,
        height: 50,
        x: plank.position.x + 350,
        y: Graphics.height() - 750,
        mass: 10,
    });
    app.setBodyTexture(heavyBox, 'metal');
    world.addBody(heavyBox);
}

const plankDemo = defineDemo('A plank', setupPlank);

export default plankDemo;
