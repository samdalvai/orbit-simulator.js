import { BodiesFactory } from '../../src';
import type { RigidBody, World } from '../../src';
import type Application from '../Application';
import { JOINT_TUNING, createDistanceJoint, defineDemo, generateFences, generateFloor } from './shared';

function setupClothSimulation(world: World, app: Application): void {
    app.setBackground('background');
    generateFloor(world, app);
    generateFences(world, app);

    const rows = 25;
    const cols = 30;
    const spacing = 25;
    const particleRadius = 1;
    const startX = -((cols * spacing) / 2);
    const topY = 100 + (rows * spacing) / 2;
    const particles: RigidBody[][] = [];

    for (let row = 0; row < rows; row++) {
        const rowParticles: RigidBody[] = [];
        for (let col = 0; col < cols; col++) {
            const x = startX + col * spacing;
            const y = topY - row * spacing;
            const mass = row === 0 ? 0 : 1;
            const particle = BodiesFactory.circle({ radius: particleRadius, x, y, mass });
            world.addBody(particle);
            rowParticles.push(particle);
        }
        particles.push(rowParticles);
    }

    const tuning = JOINT_TUNING.cloth;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const particle = particles[row][col];

            if (row > 0) {
                const above = particles[row - 1][col];
                const joint = createDistanceJoint(above, particle, tuning);
                joint.drawConnectionLine = true;
                world.addJoint(joint);
            }

            if (col < cols - 1 && row > 0) {
                const right = particles[row][col + 1];
                const joint = createDistanceJoint(particle, right, tuning);
                joint.drawConnectionLine = true;
                world.addJoint(joint);
            }
        }
    }
}

const clothSimulationDemo = defineDemo('Cloth simulation', setupClothSimulation);

export default clothSimulationDemo;
