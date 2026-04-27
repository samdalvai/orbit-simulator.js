import AssetStore from './AssetStore';
import { Body, BodyType } from './Body';
import { FIXED_DELTA_TIME, G, MAX_BODIES, PIXELS_PER_KM, SETTINGS } from './Constants';
import { Engine } from './Engine';
import Graphics from './Graphics';
import InputManager, { MouseButton } from './InputManager';
import { clamp, getOrbitPosition, getOrbitalSpeed } from './Math';

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

        const SUN_MASS = 1.98847e30; // kg
        const SUN_RADIUS_KM = 695_700; // km

        const sun = new Body(0, 0, SUN_RADIUS_KM, SUN_MASS, BodyType.STAR);
        sun.fillColor = '#fff7b2';
        sun.label = 'Sun';
        sun.texture = 'planetSun';

        const MERCURY_MASS = 3.3011e23; // kg
        const MERCURY_RADIUS_KM = 2_439.7; // km
        const MERCURY_ORBIT_RADIUS_KM = 57_909_227; // km (0.387 AU)

        const mercuryPos = getOrbitPosition(MERCURY_ORBIT_RADIUS_KM, 15);
        const mercury = new Body(mercuryPos.x, mercuryPos.y, MERCURY_RADIUS_KM, MERCURY_MASS, BodyType.PLANET);
        mercury.fillColor = '#b7ada5';
        mercury.velocity = getOrbitalSpeed(sun, mercury, G);
        mercury.label = 'Mercury';
        mercury.texture = 'planetMercury';

        const VENUS_MASS = 4.8675e24; // kg
        const VENUS_RADIUS_KM = 6_051.8; // km
        const VENUS_ORBIT_RADIUS_KM = 108_209_475; // km (0.723 AU)

        const venusPos = getOrbitPosition(VENUS_ORBIT_RADIUS_KM, 105);
        const venus = new Body(venusPos.x, venusPos.y, VENUS_RADIUS_KM, VENUS_MASS, BodyType.PLANET);
        venus.fillColor = '#d8b16f';
        venus.velocity = getOrbitalSpeed(sun, venus, G);
        venus.label = 'Venus';
        venus.texture = 'planetVenus';

        const EARTH_MASS = 5.972e24; // kg
        const EARTH_RADIUS_KM = 6_371; // km
        const EARTH_ORBIT_RADIUS_KM = 149_597_870.7; // 1 AU

        console.log('PIXELS_PER_KM: ', PIXELS_PER_KM);
        console.log('orbit: ', PIXELS_PER_KM * EARTH_ORBIT_RADIUS_KM);
        console.log('radius: ', PIXELS_PER_KM * EARTH_RADIUS_KM);

        const earthPos = getOrbitPosition(EARTH_ORBIT_RADIUS_KM, 190);
        const earth = new Body(earthPos.x, earthPos.y, EARTH_RADIUS_KM, EARTH_MASS, BodyType.PLANET);
        earth.fillColor = '#4a9fe8';
        earth.velocity = getOrbitalSpeed(sun, earth, G);
        earth.label = 'Earth';
        earth.texture = 'planetEarth';

        const MOON_MASS = 7.342e22; // kg
        const MOON_RADIUS_KM = 1_737.4; // km
        const MOON_DISTANCE_KM = 384_400; // km (average distance to Earth)

        const moonOffset = getOrbitPosition(MOON_DISTANCE_KM, 250);
        const moonPos = earth.position.addNew(moonOffset);
        const moon = new Body(moonPos.x, moonPos.y, MOON_RADIUS_KM, MOON_MASS, BodyType.PLANET);
        moon.parent = earth;
        moon.fillColor = 'gray';
        moon.velocity = earth.velocity.addNew(getOrbitalSpeed(earth, moon, G));
        moon.label = 'Moon';

        const MARS_MASS = 6.4171e23; // kg
        const MARS_RADIUS_KM = 3_389.5; // km
        const MARS_ORBIT_RADIUS_KM = 227_943_824; // km (1.524 AU)

        const marsPos = getOrbitPosition(MARS_ORBIT_RADIUS_KM, 280);
        const mars = new Body(marsPos.x, marsPos.y, MARS_RADIUS_KM, MARS_MASS, BodyType.PLANET);
        mars.fillColor = '#c76245';
        mars.velocity = getOrbitalSpeed(sun, mars, G);
        mars.label = 'Mars';
        mars.texture = 'planetMars';

        const JUPITER_MASS = 1.8982e27; // kg
        const JUPITER_RADIUS_KM = 69_911; // km
        const JUPITER_ORBIT_RADIUS_KM = 778_340_821; // km (5.203 AU)

        const jupiterPos = getOrbitPosition(JUPITER_ORBIT_RADIUS_KM, 335);
        const jupiter = new Body(jupiterPos.x, jupiterPos.y, JUPITER_RADIUS_KM, JUPITER_MASS, BodyType.PLANET);
        jupiter.fillColor = '#d1a06f';
        jupiter.velocity = getOrbitalSpeed(sun, jupiter, G);
        jupiter.label = 'Jupiter';
        jupiter.texture = 'planetJupiter';

        const SATURN_MASS = 5.6834e26; // kg
        const SATURN_RADIUS_KM = 58_232; // km
        const SATURN_ORBIT_RADIUS_KM = 1_426_666_422; // km (9.537 AU)

        const saturnPos = getOrbitPosition(SATURN_ORBIT_RADIUS_KM, 55);
        const saturn = new Body(saturnPos.x, saturnPos.y, SATURN_RADIUS_KM, SATURN_MASS, BodyType.PLANET);
        saturn.fillColor = '#d7c28b';
        saturn.velocity = getOrbitalSpeed(sun, saturn, G);
        saturn.label = 'Saturn';
        saturn.texture = 'planetSaturn';

        const URANUS_MASS = 8.681e25; // kg
        const URANUS_RADIUS_KM = 25_362; // km
        const URANUS_ORBIT_RADIUS_KM = 2_870_658_186; // km (19.191 AU)

        const uranusPos = getOrbitPosition(URANUS_ORBIT_RADIUS_KM, 145);
        const uranus = new Body(uranusPos.x, uranusPos.y, URANUS_RADIUS_KM, URANUS_MASS, BodyType.PLANET);
        uranus.fillColor = '#9fe1df';
        uranus.velocity = getOrbitalSpeed(sun, uranus, G);
        uranus.label = 'Uranus';
        uranus.texture = 'planetUranus';

        const NEPTUNE_MASS = 1.02413e26; // kg
        const NEPTUNE_RADIUS_KM = 24_622; // km
        const NEPTUNE_ORBIT_RADIUS_KM = 4_498_396_441; // km (30.07 AU)

        const neptunePos = getOrbitPosition(NEPTUNE_ORBIT_RADIUS_KM, 245);
        const neptune = new Body(neptunePos.x, neptunePos.y, NEPTUNE_RADIUS_KM, NEPTUNE_MASS, BodyType.PLANET);
        neptune.fillColor = '#5279e8';
        neptune.velocity = getOrbitalSpeed(sun, neptune, G);
        neptune.label = 'Neptune';
        neptune.texture = 'planetNeptune';

        this.engine.addBody(sun);
        this.engine.addBody(mercury);
        this.engine.addBody(venus);
        this.engine.addBody(earth);
        this.engine.addBody(mars);
        this.engine.addBody(jupiter);
        this.engine.addBody(saturn);
        this.engine.addBody(uranus);
        this.engine.addBody(neptune);
        this.engine.addBody(moon);

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
