import { BodiesFactory, DistanceJoint, RigidBody, Vec2, World } from '../../src';
import type Application from '../Application';

export const FLOOR_WIDTH = 3200;
export const FLOOR_HEIGHT = 50;
export const FLOOR_POSITION_Y = -350;
export const FENCE_WIDTH = 50;
export const FENCE_HEIGHT = FLOOR_HEIGHT + 900;

const STRESS_DEMO_COLUMNS = 25;
const STRESS_DEMO_ROWS = 40;
const SQUARE_CAGE_INNER_SIZE = 1000;

export interface CageBounds {
    innerBottom: number;
    innerTop: number;
}

export interface JointTuning {
    frequency: number;
    dampingRatio: number;
}

type DemoSetup = (world: World, app: Application) => void;

export type DemoRunner = DemoSetup & {
    label: string;
};

export const JOINT_TUNING: Record<string, JointTuning> = {
    bridge: { frequency: 14, dampingRatio: 0.9 },
    whip: { frequency: 11, dampingRatio: 0.7 },
    ragdoll: { frequency: 18, dampingRatio: 0.9 },
    plank: { frequency: 28, dampingRatio: 1.0 },
    cloth: { frequency: 16, dampingRatio: 0.95 },
    stressBridge: { frequency: 16, dampingRatio: 0.92 },
};

export function defineDemo(label: string, setup: DemoSetup): DemoRunner {
    return Object.assign(setup, { label }) as DemoRunner;
}

export function generateFloor(world: World, app: Application, width = FLOOR_WIDTH): RigidBody {
    const floor = BodiesFactory.box({ width, height: FLOOR_HEIGHT, x: 0, y: FLOOR_POSITION_Y, mass: 0.0 });
    app.setBodyTexture(floor, 'transparent');
    world.addBody(floor);
    return floor;
}

export function generateCeiling(world: World, app: Application, width = FLOOR_WIDTH): RigidBody {
    const ceiling = BodiesFactory.box({
        width,
        height: FLOOR_HEIGHT,
        x: 0,
        y: FLOOR_POSITION_Y - FLOOR_HEIGHT / 2 + FENCE_HEIGHT - FLOOR_HEIGHT / 2,
        mass: 0,
    });
    app.setBodyTexture(ceiling, 'transparent');
    world.addBody(ceiling);
    return ceiling;
}

export function generateFences(world: World, app: Application, floorWidth = FLOOR_WIDTH): [RigidBody, RigidBody] {
    const leftFence = BodiesFactory.box({
        width: FENCE_WIDTH,
        height: FENCE_HEIGHT,
        x: -(floorWidth / 2 + FENCE_WIDTH / 2),
        y: FLOOR_POSITION_Y + FLOOR_HEIGHT / 2 + FENCE_HEIGHT / 2 - FLOOR_HEIGHT,
        mass: 0.0,
    });

    const rightFence = BodiesFactory.box({
        width: FENCE_WIDTH,
        height: FENCE_HEIGHT,
        x: floorWidth / 2 + FENCE_WIDTH / 2,
        y: FLOOR_POSITION_Y + FLOOR_HEIGHT / 2 + FENCE_HEIGHT / 2 - FLOOR_HEIGHT,
        mass: 0.0,
    });

    app.setBodyTexture(leftFence, 'transparent');
    app.setBodyTexture(rightFence, 'transparent');
    world.addBody(leftFence);
    world.addBody(rightFence);

    return [leftFence, rightFence];
}

export function generateSquareCage(world: World, app: Application): CageBounds {
    const wallThickness = FLOOR_HEIGHT;
    const innerBottom = FLOOR_POSITION_Y + wallThickness / 2;
    const innerTop = innerBottom + SQUARE_CAGE_INNER_SIZE;
    const wallSpanHorizontal = SQUARE_CAGE_INNER_SIZE;
    const wallSpanVertical = SQUARE_CAGE_INNER_SIZE + wallThickness * 2;
    const wallColor = '#4d5a72';
    const walls = [
        BodiesFactory.box({
            width: wallSpanHorizontal,
            height: wallThickness,
            x: 0,
            y: innerBottom - wallThickness / 2,
            mass: 0,
        }),
        BodiesFactory.box({
            width: wallSpanHorizontal,
            height: wallThickness,
            x: 0,
            y: innerTop + wallThickness / 2,
            mass: 0,
        }),
        BodiesFactory.box({
            width: wallThickness,
            height: wallSpanVertical,
            x: -(SQUARE_CAGE_INNER_SIZE / 2 + wallThickness / 2),
            y: (innerBottom + innerTop) / 2,
            mass: 0,
        }),
        BodiesFactory.box({
            width: wallThickness,
            height: wallSpanVertical,
            x: SQUARE_CAGE_INNER_SIZE / 2 + wallThickness / 2,
            y: (innerBottom + innerTop) / 2,
            mass: 0,
        }),
    ];

    for (const wall of walls) {
        app.setBodyFillColor(wall, wallColor);
        world.addBody(wall);
    }

    return { innerBottom, innerTop };
}

export function createDistanceJoint(
    bodyA: RigidBody,
    bodyB: RigidBody,
    tuning: JointTuning,
    anchorA: Vec2 = bodyA.position,
    anchorB: Vec2 = bodyB.position,
    length = -1,
): DistanceJoint {
    return new DistanceJoint(bodyA, bodyB, anchorA, anchorB, length, tuning.frequency, tuning.dampingRatio);
}

export function populateStressDemo(
    world: World,
    bounds: CageBounds,
    createBody: (x: number, y: number, index: number) => RigidBody,
): void {
    const stepX = 34;
    const stepY = 23;
    const totalWidth = (STRESS_DEMO_COLUMNS - 1) * stepX;
    const totalHeight = (STRESS_DEMO_ROWS - 1) * stepY;
    const startX = -totalWidth / 2;
    const startY = bounds.innerBottom + (bounds.innerTop - bounds.innerBottom - totalHeight) / 2;

    for (let row = 0; row < STRESS_DEMO_ROWS; row++) {
        for (let col = 0; col < STRESS_DEMO_COLUMNS; col++) {
            const index = row * STRESS_DEMO_COLUMNS + col;
            const body = createBody(startX + col * stepX, startY + row * stepY, index);
            body.restitution = 0.05;
            body.friction = 0.6;
            world.addBody(body);
        }
    }
}
