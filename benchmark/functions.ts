import { BodyType, NO_PARENT, addNewBody, getBodyCount } from '../src/Body';
import { G, SETTINGS } from '../src/Constants';
import { Engine } from '../src/Engine';
import { applyBarnesHutGravitationalForces, applyGravitationalForces } from '../src/Gravity';
import { randomNumber } from '../src/Math';
import { Vec2 } from '../src/Vec2';

declare const process: {
    on(event: 'exit', listener: () => void): void;
};

const engine = new Engine();

const numBodies = 10_000;

for (let i = 0; i < numBodies; i++) {
    const x = randomNumber(1e-8, 1e8);
    const y = randomNumber(1e-8, 1e8);
    const radius = randomNumber(10_000, 100_000);
    const mass = randomNumber(1e16, 1e24);
    addNewBody(x, y, radius, mass, BodyType.PLANET, new Vec2(), NO_PARENT);
}

const WARM_UP_ITERATIONS = 1000;

for (let i = 0; i < WARM_UP_ITERATIONS; i++) {
    engine.update(SETTINGS.dt);
}

export function runOriginal() {
    applyGravitationalForces(G);
    // engine.update(SETTINGS.dt);
}

export function runModified() {
    applyBarnesHutGravitationalForces(G);
    // engine.update(SETTINGS.dt);
}

process.on('exit', () => {
    console.log('Body count engine: ', getBodyCount());
});
