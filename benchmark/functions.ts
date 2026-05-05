import { Body, BodyType } from '../src/Body';
import { G } from '../src/Constants';
import { Engine } from '../src/Engine';
import { applyBarnesHutGravitationalForces, applyGravitationalForces } from '../src/Gravity';
import { randomNumber } from '../src/Math';
import createEngineModule from '../wasm/out/engine.js';

declare const process: {
    on(event: 'exit', listener: () => void): void;
};

async function createEngine() {
    const wasmEngine = await createEngineModule();
    return wasmEngine;
}

const wasmEngine = createEngine();
const engine = new Engine();

const numBodies = 10_000;

for (let i = 0; i < numBodies; i++) {
    const x = randomNumber(1e-8, 1e8);
    const y = randomNumber(1e-8, 1e8);
    const radius = randomNumber(10_000, 100_000);
    const mass = randomNumber(1e16, 1e24);
    const b = new Body(x, y, radius, mass, BodyType.PLANET);

    engine.addBody(b);
    // wasmEngine
}

export function runOriginal() {}

export function runModified() {}

process.on('exit', () => {
    //
});
