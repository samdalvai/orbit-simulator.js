import { BodiesFactory, Vec2 } from '../../src';
import type { RigidBody, World } from '../../src';
import type Application from '../Application';
import {
    FLOOR_HEIGHT,
    FLOOR_POSITION_Y,
    JOINT_TUNING,
    createDistanceJoint,
    defineDemo,
    generateFences,
    generateFloor,
} from './shared';

function setupSuspensionBridge(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const stepCount = 8;
    const stepWidth = 90;
    const stepHeight = stepWidth / 4;
    const stepSpacing = 100;
    const totalSpan = (stepCount - 1) * stepSpacing + stepWidth;
    const pillarOffsetX = totalSpan / 2 + stepWidth / 2;
    const pillarWidth = 50;
    const pillarHeight = 400;
    const pillarPositionY = FLOOR_POSITION_Y + pillarHeight / 2 + FLOOR_HEIGHT / 2;

    const pillarLeft = BodiesFactory.box({
        width: pillarWidth,
        height: pillarHeight,
        x: -pillarOffsetX,
        y: pillarPositionY,
        mass: 0,
    });
    const pillarRight = BodiesFactory.box({
        width: pillarWidth,
        height: pillarHeight,
        x: pillarOffsetX,
        y: pillarPositionY,
        mass: 0,
    });

    app.setBodyTexture(pillarLeft, 'metal');
    app.setBodyTexture(pillarRight, 'metal');
    world.addBody(pillarLeft);
    world.addBody(pillarRight);

    const stepPositionY = pillarPositionY + pillarHeight / 2;
    const steps: RigidBody[] = [];

    for (let i = 0; i < stepCount; i++) {
        const x = (i - (stepCount - 1) / 2) * stepSpacing;
        const step = BodiesFactory.box({ width: stepWidth, height: stepHeight, x, y: stepPositionY, mass: 5 });
        app.setBodyTexture(step, 'woodBox');
        world.addBody(step);
        steps.push(step);
    }

    const tuning = JOINT_TUNING.bridge;
    const distance = -1;

    for (let i = 0; i < steps.length - 1; i++) {
        const a = steps[i];
        const b = steps[i + 1];

        world.addJoint(
            createDistanceJoint(
                a,
                b,
                tuning,
                a.position.addNew(new Vec2(stepWidth / 2, 0)),
                b.position.subNew(new Vec2(stepWidth / 2, 0)),
                distance,
            ),
        );
    }

    world.addJoint(
        createDistanceJoint(
            pillarLeft,
            steps[0],
            tuning,
            pillarLeft.position.addNew(new Vec2(25, 0)).addNew(new Vec2(0, pillarHeight / 2)),
            steps[0].position.subNew(new Vec2(stepWidth / 2, 0)),
            distance,
        ),
    );

    world.addJoint(
        createDistanceJoint(
            pillarRight,
            steps[steps.length - 1],
            tuning,
            pillarRight.position.subNew(new Vec2(25, 0)).addNew(new Vec2(0, pillarHeight / 2)),
            steps[steps.length - 1].position.addNew(new Vec2(stepWidth / 2, 0)),
            distance,
        ),
    );
}

const suspensionBridgeDemo = defineDemo('A suspension bridge', setupSuspensionBridge);

export default suspensionBridgeDemo;
