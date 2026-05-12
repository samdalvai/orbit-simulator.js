import Application from './src/Application';
import { FIXED_DELTA_TIME } from './src/Constants';
import GUI from './src/GUI';

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

    function loop(now: number) {
        let frameTime = (now - timePreviousFrame) / 1000;
        timePreviousFrame = now;

        // Avoid spiral of death
        frameTime = Math.min(frameTime, 0.25);

        accumulator += frameTime;

        if (app.isRunning()) {
            app.input();

            while (accumulator >= FIXED_DELTA_TIME) {
                app.update(frameTime);
                accumulator -= FIXED_DELTA_TIME;
            }

            app.render();
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

run();
