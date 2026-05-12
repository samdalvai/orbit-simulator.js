import { Body, BodyType } from '../src/Body';
import { G, SETTINGS } from '../src/Constants';
import { Engine } from '../src/Engine';
import {
    applyBarnesHutGravitationalForces,
    applyGravitationalForces,
} from '../src/Gravity';
import { randomNumber } from '../src/Math';
import { masses, posX, posY } from '../src_packed/PackedBody';
import { Engine as EnginePacked } from '../src_packed/PackedEngine';
import { Body as PackedBody } from '../src_packed/Body';

declare const process: {
    on(event: 'exit', listener: () => void): void;
};

const engine = new Engine();
const enginePacked = new EnginePacked();

const numBodies = 10_000;

for (let i = 0; i < numBodies; i++) {
    const x = randomNumber(1e-8, 1e8);
    const y = randomNumber(1e-8, 1e8);
    const radius = randomNumber(10_000, 100_000);
    const mass = randomNumber(1e16, 1e24);
    const b = new Body(x, y, radius, mass, BodyType.PLANET);
    const bPack = new PackedBody(x, y, radius, mass, BodyType.PLANET);
    // bodies.push(b);

    engine.addBody(b);
    enginePacked.addBody(bPack);
}

// const WARM_UP_ITERATIONS = 1_000;
const WARM_UP_ITERATIONS = 0;

for (let i = 0; i < WARM_UP_ITERATIONS; i++) {
    engine.update(SETTINGS.dt);
    enginePacked.update(SETTINGS.dt);
}

export function runOriginal() {
    // applyGravitationalForces(bodies, G);
    // applyBarnesHutGravitationalForces(bodies, G);
    engine.update(SETTINGS.dt);
}

export function runModified() {
    // applyBarnesHutGravitationalForces(bodies, G);
    // applyPackedBarnesHutGravitationalForces(bodies, G);
    enginePacked.update(SETTINGS.dt);
}

process.on('exit', () => {
    console.log('Body count engine: ', engine.getBodiesCount());
    console.log('Body count engine packed: ', enginePacked.getBodiesCount());

    console.log('First body engine: ', engine.getBodies()[0]);
    console.log(`First body engine packed: posX ${posX[0]} posY ${posY[0]} mass ${masses[0]}`);
});
