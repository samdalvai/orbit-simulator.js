import { BodiesFactory, DistanceJoint, Vec2 } from '../../src';
import type { RigidBody, World } from '../../src';
import type Application from '../Application';
import {
    JOINT_TUNING,
    createDistanceJoint,
    defineDemo,
    generateFences,
    generateFloor,
} from './shared';
import type { JointTuning } from './shared';

function setupBreakableJoints(world: World, app: Application): void {
    app.setBackground('darkBackground');
    generateFloor(world, app);
    generateFences(world, app);

    const ragdollBreakImpulseThreshold = 2_000;
    const bridgeBreakImpulseThreshold = 900;
    const ragdollCenter = new Vec2(0, -150);
    const ragdollTuning = JOINT_TUNING.ragdoll;
    const bridgeTuning = JOINT_TUNING.bridge;
    const ragdollBodyIds = new Set<number>();
    const bridgeBodyIds = new Set<number>();
    const bodyJoints = new Map<number, Set<DistanceJoint>>();

    const removeDistanceJoint = (joint: DistanceJoint): void => {
        world.removeJoint(joint);
        bodyJoints.get(joint.bodyA.id)?.delete(joint);
        bodyJoints.get(joint.bodyB.id)?.delete(joint);
    };

    const breakAttachedJoints = (body: RigidBody): void => {
        const joints = bodyJoints.get(body.id);
        if (!joints || joints.size === 0) {
            body.onContact = undefined;
            return;
        }

        for (const joint of [...joints]) {
            removeDistanceJoint(joint);
        }

        body.onContact = undefined;
    };

    const registerBreakableBody = (
        body: RigidBody,
        groupBodyIds: Set<number>,
        breakImpulseThreshold: number,
    ): void => {
        groupBodyIds.add(body.id);
        bodyJoints.set(body.id, new Set());
        body.onContact = info => {
            const otherBody = info.bodyA.id === body.id ? info.bodyB : info.bodyA;
            if (groupBodyIds.has(otherBody.id)) return;
            if (info.impulseSum <= breakImpulseThreshold) return;
            breakAttachedJoints(body);
        };
        world.addBody(body);
    };

    const addBreakableJoint = (
        bodyA: RigidBody,
        bodyB: RigidBody,
        anchorA: Vec2 = bodyA.position,
        anchorB: Vec2 = bodyB.position,
        length = -1,
        tuning: JointTuning = ragdollTuning,
    ): DistanceJoint => {
        const joint = createDistanceJoint(bodyA, bodyB, tuning, anchorA, anchorB, length);
        joint.drawAnchor = true;
        joint.drawConnectionLine = true;
        bodyJoints.get(bodyA.id)?.add(joint);
        bodyJoints.get(bodyB.id)?.add(joint);
        world.addJoint(joint);
        return joint;
    };

    const torso = BodiesFactory.box({ width: 50, height: 100, x: ragdollCenter.x, y: ragdollCenter.y, mass: 3.0 });
    const head = BodiesFactory.circle({
        radius: 25,
        x: ragdollCenter.x,
        y: ragdollCenter.y + 50 + 25,
        mass: 5.0,
    });
    const leftArm = BodiesFactory.box({
        width: 15,
        height: 70,
        x: ragdollCenter.x - 32,
        y: ragdollCenter.y + 10,
        mass: 1.0,
    });
    const rightArm = BodiesFactory.box({
        width: 15,
        height: 70,
        x: ragdollCenter.x + 32,
        y: ragdollCenter.y + 10,
        mass: 1.0,
    });
    const leftLeg = BodiesFactory.box({
        width: 20,
        height: 90,
        x: ragdollCenter.x - 20,
        y: ragdollCenter.y - 97,
        mass: 1.0,
    });
    const rightLeg = BodiesFactory.box({
        width: 20,
        height: 90,
        x: ragdollCenter.x + 20,
        y: ragdollCenter.y - 97,
        mass: 1.0,
    });

    app.setBodyTexture(head, 'head');
    app.setBodyTexture(torso, 'torso');
    app.setBodyTexture(leftArm, 'leftArm');
    app.setBodyTexture(rightArm, 'rightArm');
    app.setBodyTexture(leftLeg, 'leftLeg');
    app.setBodyTexture(rightLeg, 'rightLeg');

    registerBreakableBody(head, ragdollBodyIds, ragdollBreakImpulseThreshold);
    registerBreakableBody(torso, ragdollBodyIds, ragdollBreakImpulseThreshold);
    registerBreakableBody(leftArm, ragdollBodyIds, ragdollBreakImpulseThreshold);
    registerBreakableBody(rightArm, ragdollBodyIds, ragdollBreakImpulseThreshold);
    registerBreakableBody(leftLeg, ragdollBodyIds, ragdollBreakImpulseThreshold);
    registerBreakableBody(rightLeg, ragdollBodyIds, ragdollBreakImpulseThreshold);

    addBreakableJoint(
        torso,
        head,
        torso.position.addNew(new Vec2(0, 50)),
        head.position.addNew(new Vec2(0, -25)),
        0,
    );
    addBreakableJoint(
        torso,
        leftArm,
        torso.position.addNew(new Vec2(-28, 45)),
        leftArm.position.addNew(new Vec2(5, 35)),
    );
    addBreakableJoint(
        torso,
        rightArm,
        torso.position.addNew(new Vec2(28, 45)),
        rightArm.position.addNew(new Vec2(-5, 35)),
    );
    addBreakableJoint(
        torso,
        leftLeg,
        torso.position.addNew(new Vec2(-20, -50)),
        leftLeg.position.addNew(new Vec2(0, 45)),
    );
    addBreakableJoint(
        torso,
        rightLeg,
        torso.position.addNew(new Vec2(20, -50)),
        rightLeg.position.addNew(new Vec2(0, 45)),
    );

    const heavyBox = BodiesFactory.box({
        width: 60,
        height: 60,
        x: ragdollCenter.x,
        y: ragdollCenter.y + 1000,
        mass: 100,
    });
    app.setBodyTexture(heavyBox, 'metal');
    world.addBody(heavyBox);

    const bridgeAnchorY = ragdollCenter.y + 350;
    const bridgeAnchorWidth = 80;
    const bridgeAnchorHeight = 20;
    const bridgeLinkCount = 10;
    const bridgeLinkSpacing = 33;

    const startAnchor = BodiesFactory.box({
        width: bridgeAnchorWidth,
        height: bridgeAnchorHeight,
        x: ragdollCenter.x - 210,
        y: bridgeAnchorY,
        mass: 0,
    });
    app.setBodyTexture(startAnchor, 'rockBridgeAnchor');
    world.addBody(startAnchor);

    let previousBody: RigidBody = startAnchor;

    for (let i = 1; i <= bridgeLinkCount; i++) {
        const x = startAnchor.position.x + 30 + i * bridgeLinkSpacing;
        const y = bridgeAnchorY - Math.sin((i / bridgeLinkCount) * Math.PI) * 12;
        const link = BodiesFactory.circle({
            radius: 15,
            x,
            y,
            mass: 3,
            restitution: 0,
        });

        app.setBodyTexture(link, 'woodBridgeStep');
        registerBreakableBody(link, bridgeBodyIds, bridgeBreakImpulseThreshold);
        addBreakableJoint(previousBody, link, previousBody.position, link.position, -1, bridgeTuning);
        previousBody = link;
    }

    const endAnchor = BodiesFactory.box({
        width: bridgeAnchorWidth,
        height: bridgeAnchorHeight,
        x: startAnchor.position.x + 60 + bridgeLinkCount * bridgeLinkSpacing + bridgeAnchorWidth / 2,
        y: bridgeAnchorY,
        mass: 0,
    });
    app.setBodyTexture(endAnchor, 'rockBridgeAnchor');
    world.addBody(endAnchor);
    addBreakableJoint(previousBody, endAnchor, previousBody.position, endAnchor.position, -1, bridgeTuning);
}

const breakableJointsDemo = defineDemo('Breakable joints', setupBreakableJoints);

export default breakableJointsDemo;
