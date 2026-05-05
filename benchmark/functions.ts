import { Body, BodyType } from '../src/Body';
import { FIXED_DELTA_TIME, G } from '../src/Constants';
import { Engine } from '../src/Engine';
import { applyBarnesHutGravitationalForces } from '../src/Gravity';
import { randomNumber } from '../src/Math';
import type { EngineModule } from '../wasm/out/engine.js';

declare const process: {
    cwd(): string;
};

const numBodies = 10_000;
const NO_PARENT = 0xffffffff;
const DEFAULT_THETA = 0.5;
const DEFAULT_EPSILON = 1;

let wasmEngine: EngineModule | null = null;
const typescriptEngine = new Engine();
const bodies: Body[] = [];

for (let i = 0; i < numBodies; i++) {
    const x = randomNumber(1e-8, 1e8);
    const y = randomNumber(1e-8, 1e8);
    const radius = randomNumber(10_000, 100_000);
    const mass = randomNumber(1e16, 1e24);

    bodies.push(new Body(x, y, radius, mass, BodyType.PLANET));
}

export async function setupWasmBenchmark(): Promise<void> {
    type CreateEngineModule = typeof import('../wasm/out/engine.js').default;

    const engineModulePath = `${process.cwd()}/wasm/out/engine.js`;
    const { default: createEngineModule } = (await import(engineModulePath)) as { default: CreateEngineModule };
    const engine = await createEngineModule();

    engine._clearBodies();

    for (const body of bodies) {
        engine._addNewBody(
            body.position.x,
            body.position.y,
            body.radius,
            body.mass,
            body.bodyType,
            body.velocity.x,
            body.velocity.y,
            NO_PARENT,
        );
        typescriptEngine.addBody(body);
    }

    wasmEngine = engine;
}

export function runOriginal() {
    for (const body of bodies) {
        body.clearForces();
    }

    return typescriptEngine.update(FIXED_DELTA_TIME);
}

export function runModified() {
    if (!wasmEngine) {
        throw new Error('WASM benchmark has not been set up.');
    }

    return wasmEngine._update(FIXED_DELTA_TIME);
}
