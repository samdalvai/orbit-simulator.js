import Application from './app/Application';
import { FIXED_DELTA_TIME } from './shared/Constants';
import GUI from './view/GUI';

async function run() {
    const app = new Application();

    GUI.setLoadingMessage('Loading simulation...');
    try {
        await app.setup();
    } catch (error) {
        GUI.setLoadingMessage('Failed to load simulation.');
        throw error;
    }

    console.log('Setup finished, starting loop');

    let timePreviousFrame = performance.now();
    let accumulator = 0;

    document.addEventListener('visibilitychange', () => {
        app.setRunning(!document.hidden);
        if (!document.hidden) {
            // Reset previous frame time to avoid a huge deltaTime spike
            timePreviousFrame = performance.now();
        }
    });

    async function loop(now: number) {
        let frameTime = (now - timePreviousFrame) / 1000;
        timePreviousFrame = now;

        // Avoid spiral of death
        frameTime = Math.min(frameTime, 0.25);

        accumulator += frameTime;

        if (app.isRunning()) {
            app.input();

            while (accumulator >= FIXED_DELTA_TIME) {
                await app.update(frameTime);
                accumulator -= FIXED_DELTA_TIME;
            }

            app.render();
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

run();
