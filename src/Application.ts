import AssetStore from './AssetStore';
import { Body } from './Body';
import { G, MAX_BODIES, PIXELS_PER_KM, SETTINGS } from './Constants';
import Graphics from './Graphics';
import InputManager, { MouseButton } from './InputManager';
import { getOrbitalSpeed } from './Math';
import { Vec2 } from './Vec2';
import { World } from './World';

export default class Application {
    private world: World;
    private running = false;
    private paused = false;

    // Demos
    // private demoIndex = 1;

    // Inputs
    private middleMousePressed = false;
    private controlPressed = false;

    // Debug related properties
    private debug = true;
    private FPS = 0;
    private lastFPSUpdate = 0;
    private showLabels = false;

    constructor() {
        this.world = new World(G);
    }

    isRunning(): boolean {
        return this.running;
    }

    setRunning(newValue: boolean): void {
        this.running = newValue;
    }

    async setup(): Promise<void> {
        InputManager.initialize();

        await AssetStore.loadTextures();

        this.running = Graphics.openWindow();
        this.loadDemo();
    }

    loadDemo() {
        Graphics.zoom = 0.5;

        const SUN_MASS = 1.98847e30; // kg
        const SUN_RADIUS_KM = 695_700; // km

        const sun = new Body(0, 0, SUN_RADIUS_KM, SUN_MASS);
        sun.fillColor = '#fff7b2';
        sun.label = 'Sun';

        const MERCURY_MASS = 3.3011e23; // kg
        const MERCURY_RADIUS_KM = 2_439.7; // km
        const MERCURY_ORBIT_RADIUS_KM = 57_909_227; // km (0.387 AU)

        const mercury = new Body(0, MERCURY_ORBIT_RADIUS_KM, MERCURY_RADIUS_KM, MERCURY_MASS);
        mercury.fillColor = '#b7ada5';
        mercury.velocity = getOrbitalSpeed(sun, mercury, G);
        mercury.label = 'Venus';

        const VENUS_MASS = 4.8675e24; // kg
        const VENUS_RADIUS_KM = 6_051.8; // km
        const VENUS_ORBIT_RADIUS_KM = 108_209_475; // km (0.723 AU)

        const venus = new Body(0, VENUS_ORBIT_RADIUS_KM, VENUS_RADIUS_KM, VENUS_MASS);
        venus.fillColor = '#d8b16f';
        venus.velocity = getOrbitalSpeed(sun, venus, G);
        venus.label = 'Venus';

        const EARTH_MASS = 5.972e24; // kg
        const EARTH_RADIUS_KM = 6_371; // km
        const EARTH_ORBIT_RADIUS_KM = 149_597_870.7; // 1 AU

        console.log('PIXELS_PER_KM: ', PIXELS_PER_KM);
        console.log('orbit: ', PIXELS_PER_KM * EARTH_ORBIT_RADIUS_KM);
        console.log('radius: ', PIXELS_PER_KM * EARTH_RADIUS_KM);

        const earth = new Body(0, EARTH_ORBIT_RADIUS_KM, EARTH_RADIUS_KM, EARTH_MASS);
        earth.fillColor = '#4a9fe8';
        earth.velocity = getOrbitalSpeed(sun, earth, G);
        earth.label = 'Earth';

        const MOON_MASS = 7.342e22; // kg
        const MOON_RADIUS_KM = 1_737.4; // km
        const MOON_DISTANCE_KM = 384_400; // km (average distance to Earth)

        const moonPos = earth.position.addNew(new Vec2(MOON_DISTANCE_KM, 0));
        const moon = new Body(moonPos.x, moonPos.y, MOON_RADIUS_KM, MOON_MASS);
        moon.fillColor = 'gray';
        // moon.velocity = getOrbitalSpeed(earth, moon, G);
        moon.velocity = earth.velocity.addNew(getOrbitalSpeed(earth, moon, G));
        moon.label = 'Moon';

        this.world.addBody(sun);
        this.world.addBody(mercury);
        this.world.addBody(venus);
        this.world.addBody(earth);
        this.world.addBody(moon);
    }

    input(): void {
        // Handle keyboard events
        while (InputManager.keyboardInputBuffer.length > 0) {
            const inputEvent = InputManager.keyboardInputBuffer.shift();
            if (!inputEvent) return;

            switch (inputEvent.type) {
                case 'keydown': {
                    if (inputEvent.key === 'd') {
                        this.setDebug(!this.debug);
                    }

                    if (inputEvent.key === 's') {
                        this.showLabels = !this.showLabels;
                    }

                    if (inputEvent.key === 'p') {
                        this.paused = !this.paused;
                    }

                    if (inputEvent.key === '.') {
                        this.stepSimulation();
                    }

                    if (inputEvent.key === ',') {
                        // Note: this is not physically accurate, as contacts cannot work correctly with
                        // negative delta time, this is just used for testing purposes
                        this.world.update(-SETTINGS.dt);
                    }

                    if (inputEvent.key === '+') {
                        SETTINGS.subSteps += 1;
                    }

                    if (inputEvent.key === '-') {
                        SETTINGS.subSteps -= 1;
                    }

                    if (inputEvent.code === 'MetaLeft') {
                        this.controlPressed = true;
                    }

                    break;
                }
                case 'keyup':
                    if (inputEvent.code === 'MetaLeft') {
                        this.controlPressed = false;
                    }

                    break;
            }
        }

        // Handle mouse move events
        while (InputManager.mouseMoveBuffer.length > 0) {
            const inputEvent = InputManager.mouseMoveBuffer.shift();
            if (!inputEvent) return;

            if (this.middleMousePressed || this.controlPressed) {
                document.body.style.cursor = 'pointer';
                // Drag the camera opposite to mouse movement
                Graphics.pan.x -= inputEvent.movementX / Graphics.zoom;
                Graphics.pan.y += inputEvent.movementY / Graphics.zoom;
            } else {
                document.body.style.cursor = 'default';
            }

            this.updateMouseWorldPosition(inputEvent);
        }

        // Handle mouse click events
        while (InputManager.mouseInputBuffer.length > 0) {
            const inputEvent = InputManager.mouseInputBuffer.shift();
            if (!inputEvent) return;

            this.updateMouseWorldPosition(inputEvent);

            switch (inputEvent.type) {
                case 'mousedown':
                    {
                        // const x = InputManager.mousePosition.x;
                        // const y = InputManager.mousePosition.y;

                        switch (inputEvent.button) {
                            case MouseButton.LEFT:
                                break;
                            case MouseButton.RIGHT:
                                break;
                            case MouseButton.MIDDLE:
                                this.middleMousePressed = true;
                                break;
                        }
                    }
                    break;
                case 'mouseup':
                    switch (inputEvent.button) {
                        case MouseButton.LEFT:
                            break;
                        case MouseButton.MIDDLE:
                            this.middleMousePressed = false;
                            break;
                    }
                    break;
            }
        }

        // Handle wheel events
        while (InputManager.mouseWheelBuffer.length > 0) {
            const inputEvent = InputManager.mouseWheelBuffer.shift() as WheelEvent;
            if (!inputEvent) return;

            if (inputEvent.deltaY > 0) {
                Graphics.decreaseZoom();
            } else {
                Graphics.increaseZoom();
            }
        }
    }

    update(frameTime: number): void {
        if (this.debug) {
            if (!this.lastFPSUpdate || performance.now() - this.lastFPSUpdate > 1000) {
                this.lastFPSUpdate = performance.now();
                this.FPS = 1 / frameTime;
            }
        }

        if (this.paused) return;

        for (let i = 0; i < SETTINGS.subSteps; i++) {
            this.stepSimulation();
        }
    }

    render(): void {
        Graphics.clearScreen();
        Graphics.beginWorld();

        // Draw all bodies
        for (const body of this.world.getBodies()) {
            Graphics.drawBody(body, this.debug, this.showLabels);
        }

        // Graphics.drawLine(-50, 0, 50, 0, 'rgba(200, 200, 200, 0.5');
        // Graphics.drawLine(0, -50, 0, 50, 'rgba(200, 200, 200, 0.5');

        Graphics.endWorld();

        if (!this.debug) {
            return;
        }

        const x = InputManager.mousePosition.x;
        const y = InputManager.mousePosition.y;

        const stats: Array<[string, string]> = [
            ['Paused', this.paused ? 'ON' : 'OFF'],
            ['Bodies', `${this.world.getBodies().length}/${MAX_BODIES}`],
            ['FPS', this.FPS.toFixed(2)],
            ['Zoom', Graphics.zoom.toFixed(2)],
            ['Mouse (x)', `${(x / PIXELS_PER_KM).toExponential(5)} km`],
            ['Mouse (y)', `${(y / PIXELS_PER_KM).toExponential(5)} km`],
            ['DT', `${SETTINGS.dt.toFixed(4)} s`],
            ['Substeps', `${SETTINGS.subSteps}`],
        ];

        const panelX = 20;
        const panelY = 16;
        const panelWidth = 320;
        const panelPaddingX = 14;
        const panelPaddingY = 14;
        const titleHeight = 22;
        const subtitleHeight = 20;
        const rowHeight = 22;
        const panelHeight = panelPaddingY * 2 + titleHeight + subtitleHeight + stats.length * rowHeight;

        Graphics.drawFillRect(panelX, panelY, panelWidth, panelHeight, 'rgba(10, 12, 16, 0.78)');
        Graphics.drawStrokeRect(panelX, panelY, panelWidth, panelHeight, 'rgba(255, 255, 255, 0.14)');
        Graphics.drawFillRect(panelX, panelY, panelWidth, 3, '#ff9d2e');

        Graphics.drawText('DEBUG', panelX + panelPaddingX, panelY + 18, 15, 'Arial', '#ffb15c', 'left', 'middle');
        Graphics.drawText(
            'Runtime Stats',
            panelX + panelPaddingX,
            panelY + 40,
            13,
            'Arial',
            'rgba(255, 255, 255, 0.7)',
            'left',
            'middle',
        );

        const labelX = panelX + panelPaddingX;
        const valueX = panelX + panelWidth - panelPaddingX;
        const rowsTop = panelY + panelPaddingY + titleHeight + subtitleHeight + 10;

        for (let i = 0; i < stats.length; i++) {
            const [label, value] = stats[i];
            const rowY = rowsTop + i * rowHeight;

            Graphics.drawText(label, labelX, rowY, 14, 'Arial', 'rgba(255, 255, 255, 0.72)', 'left', 'middle');
            Graphics.drawText(value, valueX, rowY, 14, 'Arial', '#ffffff', 'right', 'middle');
        }
    }

    // private applyGravitationalForce(): void {
    //     const bodies = this.world.getBodies();

    //     // Less efficient but more accurate method
    //     // Force.gravity.applyGravitationalForces(bodies, GRAVITY, 0, BODY_REMOVAL_THRESHOLD * BODY_REMOVAL_THRESHOLD);

    //     Force.gravity.applyBarnesHutGravitationalForces(
    //         bodies,
    //         GRAVITY,
    //         0,
    //         BODY_REMOVAL_THRESHOLD * BODY_REMOVAL_THRESHOLD,
    //     );
    // }

    private updateMouseWorldPosition(inputEvent: MouseEvent): void {
        const screenX = inputEvent.x - Graphics.width() / 2;
        const screenY = -(inputEvent.y - Graphics.height() / 2);

        InputManager.mousePosition.x = screenX / Graphics.zoom + Graphics.pan.x;
        InputManager.mousePosition.y = screenY / Graphics.zoom + Graphics.pan.y;
    }

    private setDebug(value: boolean): void {
        this.debug = value;
    }

    private stepSimulation(): void {
        this.world.update(SETTINGS.dt);
    }
}
