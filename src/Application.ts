import AssetStore from './AssetStore';
import { BodyRenderStyle } from './BodyRenderStyle';
import { FIXED_DELTA_TIME, KILOMETERS_TO_PIXELS_RENDERING_SCALE, MAX_BODIES, SETTINGS } from './Constants';
import GUI from './GUI';
import InputManager, { MouseButton } from './InputManager';
import { clamp } from './Math';
import {
    BodyType,
    addNewBody,
    bodyIds,
    bodyIndexById,
    bodyTypes,
    getBodyCount,
    mass,
    radii,
    removeBody,
    velocityX,
    velocityY,
} from './PackedBody';
import { Engine } from './PackedEngine';
import Graphics from './PackedGraphics';
import { formatDuration } from './Utils';
import { createRandomGalaxy } from './systems/RandomGalaxy';
import { createRandomSolarSystem } from './systems/RandomSolarSystem';
import { createSolarSystem } from './systems/SolarSystem';
import { createTripleStarSystem } from './systems/TripleStarSystem';

const BLACK_HOLE_RADIUS_KM = 220_000;
const BLACK_HOLE_MASS_KG = 8e30;
const BODY_HOVER_TOLERANCE_PIXELS = 10;

const DEMO_LABELS = ['Solar system', /*'Alpha centauri',*/ 'Triple star system', 'Random system', 'Random galaxy'];

export default class Application {
    private engine: Engine;
    private bodyRenderStyles = new Map<number, BodyRenderStyle>();
    private running = false;
    private paused = false;

    // Demos
    private demoIndex = 1;
    private loadingDemo = false;

    // Inputs
    private middleMousePressed = false;
    private controlPressed = false;
    private hasMousePosition = false;

    // Debug related properties
    private debug = true;
    private FPS = 0;
    private lastFPSUpdate = 0;
    private showTextures = true;
    private showLabels = true;
    private showMoonLabels = true;
    private totalTime = 0;

    private selectedPlanet: number | null = null;
    private blackHole: number | null = null;

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
        GUI.setLoadingMessage('Loading simulation...');
        InputManager.initialize();
        GUI.initialize();
        Graphics.initialize();

        await AssetStore.loadTextures();
        await this.loadDemo();
        this.running = true;
        GUI.setLoadingMessage(null);
    }

    async loadDemo(): Promise<void> {
        if (this.loadingDemo) return;

        this.loadingDemo = true;
        this.running = false;
        GUI.setLoadingMessage('Loading simulation...');

        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        try {
            this.engine.clear();
            this.bodyRenderStyles.clear();
            this.blackHole = null;
            this.selectedPlanet = null;

            Graphics.pan.x = 0;
            Graphics.pan.y = 0;

            if (this.demoIndex === 1) {
                Graphics.zoom = 0.3;
                createSolarSystem(this.bodyRenderStyles);
            }

            if (this.demoIndex === 2) {
                Graphics.zoom = 0.2;
                createTripleStarSystem(this.engine, this.bodyRenderStyles);
            }

            if (this.demoIndex === 3) {
                Graphics.zoom = 0.16;
                const solarSystem = createRandomSolarSystem(this.engine);
                this.bodyRenderStyles = solarSystem.renderStyles;
            }

            if (this.demoIndex === 4) {
                Graphics.zoom = 0.01;
                const solarSystem = createRandomGalaxy(this.engine);
                this.bodyRenderStyles = solarSystem.renderStyles;
            }

            this.engine.initializeVerlet();
        } finally {
            this.running = true;
            this.loadingDemo = false;
            GUI.setLoadingMessage(null);
        }
    }

    input(): void {
        // Handle keyboard events
        while (InputManager.keyboardInputBuffer.length > 0) {
            const inputEvent = InputManager.keyboardInputBuffer.shift();
            if (!inputEvent) return;

            switch (inputEvent.type) {
                case 'keydown': {
                    const key = inputEvent.key.toLowerCase();

                    if (inputEvent.key === 'l') {
                        this.showLabels = !this.showLabels;
                    }

                    if (inputEvent.key === 'd') {
                        this.setDebug(!this.debug);
                    }

                    if (inputEvent.key === 't') {
                        this.showTextures = !this.showTextures;
                    }

                    if (inputEvent.key === 'm') {
                        this.showMoonLabels = !this.showMoonLabels;
                    }

                    if (inputEvent.key === 'p') {
                        this.paused = !this.paused;
                    }

                    if (key === 'b' && !inputEvent.repeat) {
                        if (inputEvent.shiftKey) {
                            this.removeBlackHole();
                        } else {
                            this.createBlackHoleAtMouse();
                        }
                    }

                    if (inputEvent.key === '.') {
                        this.stepSimulation();
                    }

                    if (inputEvent.key === ',') {
                        // Note: this is not physically accurate, as contacts cannot work correctly with
                        // negative delta time, this is just used for testing purposes
                        this.engine.update(-SETTINGS.dt);
                    }

                    if (inputEvent.key === '*') {
                        SETTINGS.subSteps += 1;
                    }

                    if (inputEvent.key === '/') {
                        SETTINGS.subSteps = clamp(SETTINGS.subSteps - 1, 1, SETTINGS.subSteps - 1);
                    }

                    if (inputEvent.key === 'z') {
                        // For testing
                    }

                    if (key === 'r' && inputEvent.shiftKey) {
                        void this.loadDemo();
                    }

                    if (inputEvent.code === 'MetaLeft') {
                        this.controlPressed = true;

                        if (this.selectedPlanet) {
                            this.selectedPlanet = null;
                        }
                    }

                    if (inputEvent.code === 'Space') {
                        this.panToNextPlanetOrStar();
                    }

                    const keyAsNum = Number(inputEvent.key);

                    if (Number.isInteger(keyAsNum) && keyAsNum > 0 && keyAsNum <= DEMO_LABELS.length) {
                        this.demoIndex = keyAsNum;
                        void this.loadDemo();
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
                        if (this.selectedPlanet) {
                            this.selectedPlanet = null;
                        }

                        switch (inputEvent.button) {
                            case MouseButton.LEFT:
                                {
                                    const bodyId = this.getHoveredBody();
                                    if (bodyId === null) return;
                                    const bodyIndex = bodyIndexById[bodyId];
                                    const pos = Graphics.getBodyRenderPosition(bodyIndex).scaleNew(
                                        KILOMETERS_TO_PIXELS_RENDERING_SCALE,
                                    );
                                    this.selectedPlanet = bodyId;
                                    Graphics.pan = pos;
                                    if (Graphics.zoom < 1) {
                                        Graphics.zoom = 1;
                                    }
                                    this.selectedPlanet = bodyId;
                                }
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
            const inputEvent = InputManager.mouseWheelBuffer.shift();
            if (!inputEvent) return;

            Graphics.zoomAt(inputEvent.x, inputEvent.y, inputEvent.deltaY > 0 ? 1 / 1.1 : 1.1);
            this.updateMouseWorldPosition(inputEvent);
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

        if (this.selectedPlanet) {
            const index = bodyIndexById[this.selectedPlanet];
            const pos = Graphics.getBodyRenderPosition(index).scaleNew(KILOMETERS_TO_PIXELS_RENDERING_SCALE);
            Graphics.pan = pos;
        }

        const viewport = Graphics.getRenderViewport();

        if (this.showTextures) {
            for (let i = 0; i < getBodyCount(); i++) {
                Graphics.drawStarLight(i, this.bodyRenderStyles.get(bodyIds[i]), viewport);
            }
        }

        // Draw all bodies
        for (let i = 0; i < getBodyCount(); i++) {
            Graphics.drawBody(
                i,
                this.bodyRenderStyles.get(bodyIds[i]),
                this.showTextures,
                this.showLabels,
                this.showMoonLabels,
                viewport,
            );
        }

        Graphics.endWorld();

        if (!this.debug) {
            this.drawHoveredBodyPopup();
            return;
        }

        const x = InputManager.mousePosition.x;
        const y = InputManager.mousePosition.y;
        const simulationSecondsPerSecond = (SETTINGS.dt * SETTINGS.subSteps) / FIXED_DELTA_TIME;

        const stats: Array<[string, string]> = [
            ['Demo', DEMO_LABELS[this.demoIndex - 1]],
            ['Paused', this.paused ? 'ON' : 'OFF'],
            ['Bodies', `${this.engine.getBodiesCount()}/${MAX_BODIES}`],
            ['FPS', this.FPS.toFixed(2)],
            ['Zoom', Graphics.zoom.toFixed(4)],
            ['Labels', this.showLabels ? 'ON' : 'OFF'],
            ['Moon labels', this.showMoonLabels ? 'ON' : 'OFF'],
            ['Mouse (x)', `${(x / KILOMETERS_TO_PIXELS_RENDERING_SCALE).toExponential(5)} km`],
            ['Mouse (y)', `${(y / KILOMETERS_TO_PIXELS_RENDERING_SCALE).toExponential(5)} km`],
            ['Physics step', formatDuration(SETTINGS.dt)],
            ['Sim time / sec', formatDuration(simulationSecondsPerSecond)],
            ['Total time', formatDuration(this.totalTime)],
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

        this.drawHoveredBodyPopup();
    }

    private updateMouseWorldPosition(inputEvent: MouseEvent): void {
        const screenX = inputEvent.x - Graphics.width() / 2;
        const screenY = -(inputEvent.y - Graphics.height() / 2);

        InputManager.mousePosition.x = screenX / Graphics.zoom + Graphics.pan.x;
        InputManager.mousePosition.y = screenY / Graphics.zoom + Graphics.pan.y;
        this.hasMousePosition = true;
    }

    private getHoveredBody(): number | null {
        if (!this.hasMousePosition) return null;

        let hoveredBody: number | null = null;
        let bestDistanceSq = Number.POSITIVE_INFINITY;
        const tolerance = BODY_HOVER_TOLERANCE_PIXELS / Graphics.zoom;

        for (let i = 0; i < getBodyCount(); i++) {
            const renderPosition = Graphics.getBodyRenderPosition(i);
            const x = renderPosition.x * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
            const y = renderPosition.y * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
            const dx = InputManager.mousePosition.x - x;
            const dy = InputManager.mousePosition.y - y;
            const hitRadius = Graphics.getBodyRenderRadius(i) + tolerance;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq <= hitRadius * hitRadius && distanceSq < bestDistanceSq) {
                hoveredBody = bodyIds[i];
                bestDistanceSq = distanceSq;
            }
        }

        return hoveredBody;
    }

    private drawHoveredBodyPopup(): void {
        const bodyId = this.getHoveredBody();
        if (bodyId === null) return;

        const bodyIndex = bodyIndexById[bodyId];
        const style = this.bodyRenderStyles.get(bodyId);
        const bodyType = BodyType[bodyTypes[bodyIndex]];
        const type = bodyType[0] + bodyType.slice(1).toLowerCase();
        const title = style?.label || type;
        const vX = velocityX[bodyIndex];
        const vY = velocityY[bodyIndex];
        const velocityMag = Math.sqrt(vX * vX + vY * vY);
        const rows: Array<[string, string]> = [
            ['Orbital speed', `${velocityMag.toFixed(2)} km/s`],
            ['Mass', `${mass[bodyIndex].toExponential(3)} kg`],
            ['Radius', `${radii[bodyIndex].toLocaleString(undefined, { maximumFractionDigits: 1 })} km`],
            ['Type', type],
        ];

        const width = 300;
        const height = 178;
        const padding = 14;
        const imageSize = 54;
        const mouseScreenX = (InputManager.mousePosition.x - Graphics.pan.x) * Graphics.zoom + Graphics.width() / 2;
        const mouseScreenY = Graphics.height() / 2 - (InputManager.mousePosition.y - Graphics.pan.y) * Graphics.zoom;
        const x = Math.max(12, Math.min(mouseScreenX + 18, Graphics.width() - width - 12));
        const y = Math.max(12, Math.min(mouseScreenY + 18, Graphics.height() - height - 12));

        Graphics.drawFillRect(x, y, width, height, 'rgba(10, 12, 16, 0.88)');
        Graphics.drawStrokeRect(x, y, width, height, 'rgba(255, 255, 255, 0.18)');
        Graphics.drawFillRect(x, y, width, 3, style?.fillColor || '#ffffff');

        if (style?.texture) {
            Graphics.ctx.drawImage(style.texture, x + padding, y + padding + 4, imageSize, imageSize);
        } else {
            Graphics.drawFillCircle(
                x + padding + imageSize / 2,
                y + padding + imageSize / 2 + 4,
                imageSize / 2,
                style?.fillColor || '#ffffff',
            );
        }

        Graphics.drawText(title, x + padding + imageSize + 12, y + 28, 16, 'Arial', '#ffffff', 'left', 'middle');

        const rowsTop = y + padding + imageSize + 22;
        for (let i = 0; i < rows.length; i++) {
            const [label, value] = rows[i];
            const rowY = rowsTop + i * 22;

            Graphics.drawText(label, x + padding, rowY, 13, 'Arial', 'rgba(255, 255, 255, 0.72)', 'left', 'middle');
            Graphics.drawText(value, x + width - padding, rowY, 13, 'Arial', '#ffffff', 'right', 'middle');
        }
    }

    private setDebug(value: boolean): void {
        this.debug = value;
    }

    private stepSimulation(): void {
        this.engine.update(SETTINGS.dt);
        this.totalTime += SETTINGS.dt;
    }

    private panToNextPlanetOrStar(): void {
        let hasPlanetOrStar = false;

        for (let i = 0; i < getBodyCount(); i++) {
            const bodyType = bodyTypes[i];

            if (bodyType === BodyType.PLANET || bodyType === BodyType.STAR) {
                hasPlanetOrStar = true;
                break;
            }
        }

        if (!hasPlanetOrStar) return;

        const selectedIndex = this.selectedPlanet !== null ? bodyIndexById[this.selectedPlanet] : -1;
        let nextIndex = (selectedIndex + 1) % getBodyCount();

        while (bodyTypes[nextIndex] !== BodyType.PLANET && bodyTypes[nextIndex] !== BodyType.STAR) {
            nextIndex = (nextIndex + 1) % getBodyCount();
        }

        const nextBodyId = bodyIds[nextIndex];
        const pos = Graphics.getBodyRenderPosition(nextIndex).scaleNew(KILOMETERS_TO_PIXELS_RENDERING_SCALE);
        Graphics.pan = pos;
        if (Graphics.zoom < 1) {
            Graphics.zoom = 1;
        }
        this.selectedPlanet = nextBodyId;
    }

    private createBlackHoleAtMouse(): void {
        this.removeBlackHole();

        const x = InputManager.mousePosition.x / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = InputManager.mousePosition.y / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const blackHoleId = addNewBody(x, y, BLACK_HOLE_RADIUS_KM, BLACK_HOLE_MASS_KG, BodyType.STAR);

        if (blackHoleId !== null) {
            this.bodyRenderStyles.set(blackHoleId, {
                fillColor: '#030009',
                texture: AssetStore.getTexture('blackHole'),
                label: 'Black Hole',
                labelColor: '#d9b8ff',
                labelFontSize: 16,
            });

            this.blackHole = blackHoleId;
        }
    }

    private removeBlackHole(): void {
        if (this.blackHole === null) {
            return;
        }

        removeBody(this.blackHole);
        this.bodyRenderStyles.delete(this.blackHole);
        this.blackHole = null;
    }
}
