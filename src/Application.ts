import AssetStore from './AssetStore';
import { FIXED_DELTA_TIME, MAX_BODIES, PIXELS_PER_KM, SETTINGS } from './Constants';
import { Engine } from './Engine';
import Graphics from './Graphics';
import InputManager, { MouseButton } from './InputManager';
import { clamp } from './Math';
import { createSolarSystem } from './SolarSystem';

export default class Application {
    private engine: Engine;
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
    private showTextures = true;
    private showLabels = true;
    private totalTime = 0;

    constructor() {
        this.engine = new Engine();
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
        this.engine.clear();
        Graphics.zoom = 0.5;

        createSolarSystem(this.engine);

        this.engine.initializeVerlet();
    }

    input(): void {
        // Handle keyboard events
        while (InputManager.keyboardInputBuffer.length > 0) {
            const inputEvent = InputManager.keyboardInputBuffer.shift();
            if (!inputEvent) return;

            switch (inputEvent.type) {
                case 'keydown': {
                    const key = inputEvent.key.toLowerCase();

                    if (inputEvent.key === 'd') {
                        this.setDebug(!this.debug);
                    }

                    if (inputEvent.key === 's') {
                        this.showLabels = !this.showLabels;
                    }

                    if (inputEvent.key === 'f') {
                        this.showTextures = !this.showTextures;
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
                        this.engine.update(-SETTINGS.dt);
                    }

                    if (inputEvent.key === '+') {
                        SETTINGS.subSteps += 1;
                    }

                    if (inputEvent.key === '-') {
                        SETTINGS.subSteps = clamp(SETTINGS.subSteps - 1, 1, SETTINGS.subSteps - 1);
                    }

                    if (key === 'r' && inputEvent.shiftKey) {
                        this.loadDemo();
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

        // Debug for moon to earh distance
        // const bodies = this.engine.getBodies();
        // const earth = bodies[bodies.length - 2];
        // const moon = bodies[bodies.length - 1];
        // const distSq = earth.position.distanceSquared(moon.position);
        // const dist = Math.sqrt(distSq);
        // console.log('dist: ', dist);
    }

    render(): void {
        Graphics.clearScreen();
        Graphics.beginWorld();

        // Draw all bodies
        for (const body of this.engine.getBodies()) {
            Graphics.drawBody(body, this.showTextures, this.showLabels);
        }

        // Graphics.drawLine(-50, 0, 50, 0, 'rgba(200, 200, 200, 0.5');
        // Graphics.drawLine(0, -50, 0, 50, 'rgba(200, 200, 200, 0.5');

        Graphics.endWorld();

        if (!this.debug) {
            return;
        }

        const x = InputManager.mousePosition.x;
        const y = InputManager.mousePosition.y;
        const simulationSecondsPerSecond = (SETTINGS.dt * SETTINGS.subSteps) / FIXED_DELTA_TIME;

        const stats: Array<[string, string]> = [
            ['Paused', this.paused ? 'ON' : 'OFF'],
            ['Bodies', `${this.engine.getBodies().length}/${MAX_BODIES}`],
            ['FPS', this.FPS.toFixed(2)],
            ['Zoom', Graphics.zoom.toFixed(2)],
            ['Mouse (x)', `${(x / PIXELS_PER_KM).toExponential(5)} km`],
            ['Mouse (y)', `${(y / PIXELS_PER_KM).toExponential(5)} km`],
            ['Physics step', this.formatDuration(SETTINGS.dt)],
            ['Sim time / sec', this.formatDuration(simulationSecondsPerSecond)],
            ['Total time', this.formatDuration(this.totalTime)],
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
        this.engine.update(SETTINGS.dt);
        this.totalTime += SETTINGS.dt;
    }

    private formatDuration(seconds: number): string {
        const minutes = seconds / 60;
        if (minutes < 60) {
            return `${minutes.toFixed(2)} min`;
        }

        const hours = minutes / 60;
        if (hours < 24) {
            return `${hours.toFixed(2)} h`;
        }

        const days = hours / 24;
        return `${days.toFixed(2)} d`;
    }
}
