import { BodiesFactory, WeldJoint } from '../../src';
import type { RigidBody, World } from '../../src';
import type Application from '../Application';
import { defineDemo, generateFloor } from './shared';

function setupWeldedBoxes(world: World, app: Application): void {
    app.setBackground('background');
    const floor = generateFloor(world, app);
    floor.rotation = -0.1;
    floor.position.y += 100;
    floor.shape.updateAABB(floor);
    floor.shape.updateVertices(floor.rotation, floor.position);

    const boxWidth = 20;
    const boxRows = 10;
    const xOffset = 250;
    const yOffset = 250;
    const spacing = 1;

    for (let i = 0; i < boxRows; i++) {
        for (let j = 0; j < boxRows; j++) {
            const box = BodiesFactory.box({
                width: boxWidth,
                height: boxWidth,
                x: boxWidth * i + spacing * i + xOffset,
                y: boxWidth * j + spacing * j + yOffset,
                mass: 1,
                restitution: 0,
            });
            world.addBody(box);
        }
    }

    const boxes: RigidBody[][] = [];

    for (let i = 0; i < boxRows; i++) {
        boxes[i] = [];

        for (let j = 0; j < boxRows; j++) {
            const box = BodiesFactory.box({
                width: boxWidth,
                height: boxWidth,
                x: boxWidth * i + spacing * i - xOffset - boxWidth * boxRows,
                y: boxWidth * j + spacing * j + yOffset,
                mass: 1,
                restitution: 0,
            });

            world.addBody(box);
            boxes[i][j] = box;
        }
    }

    const jointFrequency = 30;
    const jointDamping = 0.5;

    for (let i = 0; i < boxRows; i++) {
        for (let j = 0; j < boxRows; j++) {
            const current = boxes[i][j];

            if (i + 1 < boxRows) {
                const right = boxes[i + 1][j];
                const weld = new WeldJoint(current, right, undefined, jointFrequency, jointDamping);
                weld.drawAnchor = true;
                weld.drawConnectionLine = true;
                world.addJoint(weld);
            }

            if (j + 1 < boxRows) {
                const below = boxes[i][j + 1];
                const weld = new WeldJoint(current, below, undefined, jointFrequency, jointDamping);
                weld.drawAnchor = true;
                weld.drawConnectionLine = true;
                world.addJoint(weld);
            }
        }
    }
}

const weldedBoxesDemo = defineDemo('Welded boxes', setupWeldedBoxes);

export default weldedBoxesDemo;
