import { Body, BodyType } from '../src/Body';
import { G, SETTINGS } from '../src/Constants';
import { applyBarnesHutGravitationalForces as applyBarnesHutGravitationalForces_old, applyGravitationalForces as applyGravitationalForces_old } from '../src/Gravity_old';
import { applyBarnesHutGravitationalForces, applyGravitationalForces } from '../src/Gravity';
import { randomNumber } from '../src/Math';

declare const process: {
    on(event: 'exit', listener: () => void): void;
};

const numBodies = 1_000;
const bodies: Body[] = [];

for (let i = 0; i < numBodies; i++) {
    const x = randomNumber(1e-8, 1e8);
    const y = randomNumber(1e-8, 1e8);
    const radius = randomNumber(10_000, 100_000);
    const mass = randomNumber(1e16, 1e24);
    const b = new Body(x, y, radius, mass, BodyType.PLANET);
    bodies.push(b);
}

export function runOriginal() {
    applyGravitationalForces_old(bodies, G);
    applyBarnesHutGravitationalForces_old(bodies, G);
}

export function runModified() {
    // applyGravitationalForces(bodies, G);
    // applyBarnesHutGravitationalForces(bodies, G);
}

process.on('exit', () => {
    //
});
