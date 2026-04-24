import { BodiesFactory, Vec2 } from '../../src';
import type { World } from '../../src';
import type Application from '../Application';
import {
    JOINT_TUNING,
    createDistanceJoint,
    defineDemo,
    generateFences,
    generateFloor,
} from './shared';

function setupSkeletonRagdoll(world: World, app: Application): void {
    app.setBackground('darkBackground');
    generateFloor(world, app);
    generateFences(world, app);

    const torso = BodiesFactory.box({ width: 50, height: 100, x: 0, y: -100, mass: 3.0 });
    const head = BodiesFactory.circle({ radius: 25, x: torso.position.x, y: torso.position.y + 50 + 25, mass: 5.0 });
    const leftArm = BodiesFactory.box({
        width: 15,
        height: 70,
        x: torso.position.x - 32,
        y: torso.position.y + 10,
        mass: 1.0,
    });
    const rightArm = BodiesFactory.box({
        width: 15,
        height: 70,
        x: torso.position.x + 32,
        y: torso.position.y + 10,
        mass: 1.0,
    });
    const leftLeg = BodiesFactory.box({
        width: 20,
        height: 90,
        x: torso.position.x - 20,
        y: torso.position.y - 97,
        mass: 1.0,
    });
    const rightLeg = BodiesFactory.box({
        width: 20,
        height: 90,
        x: torso.position.x + 20,
        y: torso.position.y - 97,
        mass: 1.0,
    });
    app.setBodyTexture(head, 'head');
    app.setBodyTexture(torso, 'torso');
    app.setBodyTexture(leftArm, 'leftArm');
    app.setBodyTexture(rightArm, 'rightArm');
    app.setBodyTexture(leftLeg, 'leftLeg');
    app.setBodyTexture(rightLeg, 'rightLeg');
    world.addBody(head);
    world.addBody(torso);
    world.addBody(leftArm);
    world.addBody(rightArm);
    world.addBody(leftLeg);
    world.addBody(rightLeg);

    const bodyTuning = JOINT_TUNING.ragdoll;

    world.addJoint(
        createDistanceJoint(
            torso,
            head,
            bodyTuning,
            torso.position.addNew(new Vec2(0, 50)),
            head.position.addNew(new Vec2(0, -25)),
            0,
        ),
    );
    world.addJoint(
        createDistanceJoint(
            torso,
            leftArm,
            bodyTuning,
            torso.position.addNew(new Vec2(-28, 45)),
            leftArm.position.addNew(new Vec2(5, 35)),
        ),
    );
    world.addJoint(
        createDistanceJoint(
            torso,
            rightArm,
            bodyTuning,
            torso.position.addNew(new Vec2(28, 45)),
            rightArm.position.addNew(new Vec2(-5, 35)),
        ),
    );
    world.addJoint(
        createDistanceJoint(
            torso,
            leftLeg,
            bodyTuning,
            torso.position.addNew(new Vec2(-20, -50)),
            leftLeg.position.addNew(new Vec2(0, 45)),
        ),
    );
    world.addJoint(
        createDistanceJoint(
            torso,
            rightLeg,
            bodyTuning,
            torso.position.addNew(new Vec2(20, -50)),
            rightLeg.position.addNew(new Vec2(0, 45)),
        ),
    );
}

const skeletonRagdollDemo = defineDemo('A skeleton ragdoll', setupSkeletonRagdoll);

export default skeletonRagdollDemo;
