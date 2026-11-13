import { createSolarSystem } from '../scenarios/BodyGeneration';
import { createRandomGalaxy } from '../scenarios/RandomGalaxy';
import { createRandomSolarSystem } from '../scenarios/RandomSolarSystem';
import { solarSystem } from '../scenarios/SolarSystem';
import { testSystem } from '../scenarios/TestSystem';
import { tripleStarSystem } from '../scenarios/TripleStarSystem';
import { FIXED_DELTA_TIME, KILOMETERS_TO_PIXELS_RENDERING_SCALE, MAX_BODIES, SETTINGS } from '../shared/Constants';
import { COMPACT_SCREEN_WIDTH, IS_TOUCH_DEVICE } from '../shared/Device';
import { clamp } from '../shared/Math';
import { formatDuration } from '../shared/Utils';
import {
    BODY_NOT_CREATED,
    BodyType,
    addNewBody,
    bodyIds,
    bodyIndexById,
    bodyTypes,
    getBodyCount,
    mass,
    positionX,
    positionY,
    positionZ,
    radii,
    removeBody,
    velocityX,
    velocityY,
    velocityZ,
} from '../sim/Body';
import { explodeBody } from '../sim/Collision';
import { Engine } from '../sim/Engine';
import AssetStore from '../view/AssetStore';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE, getBodyRenderRadius } from '../view/BodyRenderStyle';
import GUI, { ControlActions } from '../view/GUI';
import InputManager, { MouseButton, TouchGesture } from '../view/InputManager';
import Renderer, { RenderItem } from '../view/Renderer';

const BLACK_HOLE_RADIUS_KM = 220_000;
const BLACK_HOLE_MASS_KG = 8e30;
const BODY_HOVER_TOLERANCE_PIXELS = 10;
const CAMERA_ROTATION_SENSITIVITY = 0.005;
const CAMERA_KEY_ROTATION_STEP = 0.06;
const TOUCH_TAP_TOLERANCE_PIXELS = 18;
const BODY_POPUP_WIDTH = 350;
const BODY_POPUP_HEIGHT = 200;
const MIN_SIMULATION_SPEED = 1;
const SIMULATION_SPEED_HOLD_STEP_MS = 400;

const DEMO_LABELS = ['Solar system', 'Triple star system', 'Random system', 'Random galaxy', 'Test scenario'];

export default class Application {
    private engine: Engine;
    private renderer: Renderer;
    private inputManager: InputManager;

    private bodyRenderStyles = new Map<number, BodyRenderStyle>();
    private running = false;
    private paused = false;

    // Demos
    private demoIndex = 1;
    private loadingDemo = false;

    // Inputs
    private middleMousePressed = false;
    private rightMousePressed = false;
    private controlPressed = false;
    private hasMousePosition = false;
    private simulationSpeedKey: '+' | '-' | null = null;
    private simulationSpeedKeyPressedAt = 0;

    // Debug related properties
    private debug = !IS_TOUCH_DEVICE;
    private FPS = 0;
    private lastFPSUpdate = 0;
    private showTextures = true;
    private showLabels = true;
    private showMoonLabels = true;
    private totalTime = 0;

    private selectedPlanet: number | null = null;
    private blackHole: number | null = null;

    constructor() {
        this.engine = new Engine(this.bodyRenderStyles);
        this.renderer = new Renderer(this.bodyRenderStyles);
        this.inputManager = new InputManager();
    }

    isRunning(): boolean {
        return this.running;
    }

    setRunning(newValue: boolean): void {
        this.running = newValue;
    }

    async setup(): Promise<void> {
        GUI.setLoadingMessage('Loading simulation...');
        GUI.initialize(this.createControlActions());

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

            this.renderer.setCameraTarget(0, 0, 0);
            this.renderer.resetCameraOrientation();

            if (this.demoIndex === 1) {
                this.renderer.zoom = 0.3;
                createSolarSystem(solarSystem, this.bodyRenderStyles);
            }

            if (this.demoIndex === 2) {
                this.renderer.zoom = 0.2;
                createSolarSystem(tripleStarSystem, this.bodyRenderStyles);
            }

            if (this.demoIndex === 3) {
                this.renderer.zoom = 0.16;
                const randomSolarSystemSpec = createRandomSolarSystem(true);
                createSolarSystem(randomSolarSystemSpec, this.bodyRenderStyles);
            }

            if (this.demoIndex === 4) {
                this.renderer.zoom = 0.01;
                createRandomGalaxy(this.bodyRenderStyles);
            }

            if (this.demoIndex === 5) {
                this.renderer.zoom = 0.3;
                createSolarSystem(testSystem, this.bodyRenderStyles);
            }

            await this.engine.initializeVerlet();
        } finally {
            this.running = true;
            this.loadingDemo = false;
            GUI.setLoadingMessage(null);
            GUI.refreshControls();
        }
    }

    async input(): Promise<void> {
        // Handle keyboard events
        while (this.inputManager.keyboardInputBuffer.length > 0) {
            const inputEvent = this.inputManager.keyboardInputBuffer.shift();
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
                        await this.stepSimulation();
                    }

                    if (inputEvent.key === ',') {
                        // Note: this is not physically accurate, as contacts cannot work correctly with
                        // negative delta time, this is just used for testing purposes
                        await this.engine.update(-SETTINGS.dt);
                    }

                    if (inputEvent.key === '+') {
                        this.adjustSimulationSpeed('+', 1, inputEvent.repeat);
                    }

                    if (inputEvent.key === '-') {
                        this.adjustSimulationSpeed('-', -1, inputEvent.repeat);
                    }

                    if (inputEvent.key === '*') {
                        SETTINGS.subSteps += 1;
                    }

                    if (inputEvent.key === '/') {
                        SETTINGS.subSteps = clamp(SETTINGS.subSteps - 1, 1, SETTINGS.subSteps - 1);
                    }

                    if (inputEvent.key === 'z') {
                        for (const [id] of this.bodyRenderStyles) {
                            explodeBody(id, this.bodyRenderStyles);
                            break;
                        }
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

                    if (inputEvent.key === 'ArrowLeft') {
                        this.renderer.rotateCamera(-CAMERA_KEY_ROTATION_STEP, 0);
                    }

                    if (inputEvent.key === 'ArrowRight') {
                        this.renderer.rotateCamera(CAMERA_KEY_ROTATION_STEP, 0);
                    }

                    if (inputEvent.key === 'ArrowUp') {
                        this.renderer.rotateCamera(0, -CAMERA_KEY_ROTATION_STEP);
                    }

                    if (inputEvent.key === 'ArrowDown') {
                        this.renderer.rotateCamera(0, CAMERA_KEY_ROTATION_STEP);
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

                    if (inputEvent.key === '+' || inputEvent.key === '-') {
                        this.simulationSpeedKey = null;
                    }

                    break;
            }
        }

        // Handle mouse move events
        while (this.inputManager.mouseMoveBuffer.length > 0) {
            const inputEvent = this.inputManager.mouseMoveBuffer.shift();
            if (!inputEvent) return;

            if (this.rightMousePressed) {
                document.body.style.cursor = 'grabbing';
                this.renderer.rotateCamera(
                    inputEvent.movementX * CAMERA_ROTATION_SENSITIVITY,
                    -inputEvent.movementY * CAMERA_ROTATION_SENSITIVITY,
                );
            } else if (this.middleMousePressed || this.controlPressed) {
                document.body.style.cursor = 'pointer';
                this.renderer.panByScreenDelta(inputEvent.movementX, inputEvent.movementY);
            } else {
                document.body.style.cursor = 'default';
            }

            this.updateMouseWorldPosition(inputEvent);
        }

        // Handle mouse click events
        while (this.inputManager.mouseInputBuffer.length > 0) {
            const inputEvent = this.inputManager.mouseInputBuffer.shift();
            if (!inputEvent) return;

            this.updateMouseWorldPosition(inputEvent);

            switch (inputEvent.type) {
                case 'mousedown':
                    {
                        if (this.selectedPlanet && inputEvent.button !== MouseButton.RIGHT) {
                            this.selectedPlanet = null;
                        }

                        switch (inputEvent.button) {
                            case MouseButton.LEFT:
                                {
                                    const bodyId = this.getHoveredBody();
                                    if (bodyId === null) return;
                                    const bodyIndex = bodyIndexById[bodyId];
                                    this.selectedPlanet = bodyId;
                                    this.panToBody(bodyIndex);
                                    if (this.renderer.zoom < 1) {
                                        this.renderer.zoom = 1;
                                    }
                                    this.selectedPlanet = bodyId;
                                }
                                break;
                            case MouseButton.RIGHT:
                                this.rightMousePressed = true;
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
                        case MouseButton.RIGHT:
                            this.rightMousePressed = false;
                            break;
                        case MouseButton.MIDDLE:
                            this.middleMousePressed = false;
                            break;
                    }
                    break;
            }
        }

        // Handle wheel events
        while (this.inputManager.mouseWheelBuffer.length > 0) {
            const inputEvent = this.inputManager.mouseWheelBuffer.shift();
            if (!inputEvent) return;

            if (GUI.shortcutsOverlayVisible()) return;
            this.renderer.zoomAt(inputEvent.x, inputEvent.y, inputEvent.deltaY > 0 ? 1 / 1.1 : 1.1);
            this.updateMouseWorldPosition(inputEvent);
        }

        // Handle touch gestures
        while (this.inputManager.touchGestureBuffer.length > 0) {
            const gesture = this.inputManager.touchGestureBuffer.shift();
            if (!gesture) return;

            this.handleTouchGesture(gesture);
        }
    }

    private handleTouchGesture(gesture: TouchGesture): void {
        switch (gesture.type) {
            case 'drag':
                this.renderer.rotateCamera(
                    gesture.dx * CAMERA_ROTATION_SENSITIVITY,
                    -gesture.dy * CAMERA_ROTATION_SENSITIVITY,
                );
                break;
            case 'pinch':
                if (gesture.dx !== 0 || gesture.dy !== 0) {
                    // Panning detaches the camera from the followed body
                    this.selectedPlanet = null;
                    this.renderer.panByScreenDelta(gesture.dx, gesture.dy);
                }

                if (gesture.factor !== 1 && Number.isFinite(gesture.factor) && gesture.factor > 0) {
                    if (this.selectedPlanet !== null) {
                        // Keep the followed body centered while zooming
                        this.renderer.zoom *= gesture.factor;
                    } else {
                        this.renderer.zoomAt(gesture.x, gesture.y, gesture.factor);
                    }
                }
                break;
            case 'tap': {
                this.setPointerPosition(gesture.x, gesture.y);
                const bodyId = this.getHoveredBody(undefined, TOUCH_TAP_TOLERANCE_PIXELS);

                if (bodyId === null) {
                    this.selectedPlanet = null;
                    break;
                }

                this.panToBody(bodyIndexById[bodyId]);
                if (this.renderer.zoom < 1) {
                    this.renderer.zoom = 1;
                }
                this.selectedPlanet = bodyId;
                break;
            }
        }
    }

    private createControlActions(): ControlActions {
        return {
            demoLabels: DEMO_LABELS,
            getState: () => ({
                demoIndex: this.demoIndex,
                paused: this.paused,
                showLabels: this.showLabels,
                showMoonLabels: this.showMoonLabels,
                showTextures: this.showTextures,
                debug: this.debug,
                hasBlackHole: this.blackHole !== null,
                simulationSpeed: SETTINGS.simulationSpeed,
                subSteps: SETTINGS.subSteps,
            }),
            selectDemo: index => {
                this.demoIndex = clamp(index, 1, DEMO_LABELS.length);
                void this.loadDemo();
            },
            resetDemo: () => void this.loadDemo(),
            togglePause: () => {
                this.paused = !this.paused;
            },
            step: () => void this.stepSimulation(),
            changeSimulationSpeed: direction => {
                const speed = SETTINGS.simulationSpeed;
                const reference = direction > 0 ? speed : speed - 1;
                const step = reference < 10 ? 1 : reference < 100 ? 10 : 100;
                SETTINGS.simulationSpeed = Math.max(MIN_SIMULATION_SPEED, speed + direction * step);
            },
            changeSubSteps: direction => {
                SETTINGS.subSteps = Math.max(1, SETTINGS.subSteps + direction);
            },
            nextBody: () => this.panToNextPlanetOrStar(),
            toggleLabels: () => {
                this.showLabels = !this.showLabels;
            },
            toggleMoonLabels: () => {
                this.showMoonLabels = !this.showMoonLabels;
            },
            toggleTextures: () => {
                this.showTextures = !this.showTextures;
            },
            toggleDebug: () => this.setDebug(!this.debug),
            toggleBlackHole: () => {
                if (this.blackHole !== null) {
                    this.removeBlackHole();
                    return;
                }

                // On touch devices there is no mouse, create the black hole at the screen center
                const center = this.renderer.screenToWorldAtZ(this.renderer.width() / 2, this.renderer.height() / 2, 0);
                this.createBlackHoleAt(center?.x ?? this.renderer.targetX, center?.y ?? this.renderer.targetY);
            },
        };
    }

    async update(frameTime: number): Promise<void> {
        if (this.debug) {
            if (!this.lastFPSUpdate || performance.now() - this.lastFPSUpdate > 1000) {
                this.lastFPSUpdate = performance.now();
                this.FPS = 1 / frameTime;
            }
        }

        if (this.paused) return;

        for (let j = 0; j < SETTINGS.subSteps; j++) {
            await this.stepSimulation();
        }
    }

    render(): void {
        this.renderer.clearScreen();

        if (this.selectedPlanet !== null) {
            const index = bodyIndexById[this.selectedPlanet];
            this.panToBody(index);
        }

        const renderItems = this.renderer.getRenderItems();

        if (this.showTextures) {
            for (const renderItem of renderItems) {
                this.renderer.drawGlow(renderItem);
            }
        }

        // Draw all bodies
        for (const renderItem of renderItems) {
            this.renderer.drawBody(renderItem, this.showTextures, this.showLabels, this.showMoonLabels);
        }

        if (!this.debug) {
            this.drawBodyPopup(renderItems);
            return;
        }

        const x = this.inputManager.mousePosition.x;
        const y = this.inputManager.mousePosition.y;
        const yawDegrees = (this.renderer.yaw() * 180) / Math.PI;
        const pitchDegrees = (this.renderer.pitch() * 180) / Math.PI;
        const simulationSecondsPerSecond = (SETTINGS.dt * SETTINGS.subSteps) / FIXED_DELTA_TIME;

        const stats: Array<[string, string]> = [
            ['Demo', DEMO_LABELS[this.demoIndex - 1] + ' (' + this.demoIndex + ')'],
            ['Paused', this.paused ? 'ON' : 'OFF'],
            ['Bodies', `${getBodyCount()}/${MAX_BODIES}`],
            ['FPS', this.FPS.toFixed(2)],
            ['Zoom', this.renderer.zoom.toFixed(8)],
            ['Yaw', `${yawDegrees.toFixed(1)} deg`],
            ['Pitch', `${pitchDegrees.toFixed(1)} deg`],
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

        // Shrink the panel on small screens, leaving room for the help button and the touch controls
        // On touch devices the info popup of the followed body is docked at the bottom, keep room for it
        const popupHeight = IS_TOUCH_DEVICE && this.selectedPlanet !== null ? BODY_POPUP_HEIGHT + 12 : 0;
        const hudScale = this.getHudScale(
            panelX + panelWidth + 70,
            panelY + panelHeight + popupHeight + GUI.bottomBarHeight() + 16,
        );
        this.renderer.pushScreenScale(hudScale);

        this.renderer.drawFillRect(panelX, panelY, panelWidth, panelHeight, 'rgba(10, 12, 16, 0.78)');
        this.renderer.drawStrokeRect(panelX, panelY, panelWidth, panelHeight, 'rgba(255, 255, 255, 0.14)');
        this.renderer.drawFillRect(panelX, panelY, panelWidth, 3, '#ff9d2e');

        this.renderer.drawText('DEBUG', panelX + panelPaddingX, panelY + 18, 15, 'Arial', '#ffb15c', 'left', 'middle');
        this.renderer.drawText(
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

            this.renderer.drawText(label, labelX, rowY, 14, 'Arial', 'rgba(255, 255, 255, 0.72)', 'left', 'middle');
            this.renderer.drawText(value, valueX, rowY, 14, 'Arial', '#ffffff', 'right', 'middle');
        }

        this.renderer.popScreenScale();

        this.drawBodyPopup(renderItems);
    }

    /** Scale factor for HUD panels so that a panel of the required size fits on small screens */
    private getHudScale(requiredWidth: number, requiredHeight = 0): number {
        const width = this.renderer.width();
        if (width >= COMPACT_SCREEN_WIDTH && !IS_TOUCH_DEVICE) return 1;
        const height = this.renderer.height();
        const scale = Math.min(width / requiredWidth, requiredHeight > 0 ? height / requiredHeight : 1);
        return clamp(scale, 0.55, 1);
    }

    private setPointerPosition(screenX: number, screenY: number): void {
        this.updateMouseWorldPosition({ x: screenX, y: screenY } as MouseEvent);
    }

    private updateMouseWorldPosition(inputEvent: MouseEvent): void {
        this.inputManager.mouseScreenPosition.x = inputEvent.x;
        this.inputManager.mouseScreenPosition.y = inputEvent.y;

        const mouseWorldPosition = this.renderer.screenToWorldAtZ(inputEvent.x, inputEvent.y, 0);

        if (mouseWorldPosition !== null) {
            this.inputManager.mousePosition.x = mouseWorldPosition.x;
            this.inputManager.mousePosition.y = mouseWorldPosition.y;
            this.inputManager.mousePosition.z = mouseWorldPosition.z;
            this.hasMousePosition = true;
            return;
        }

        const screenX = inputEvent.x - this.renderer.width() / 2;
        const screenY = -(inputEvent.y - this.renderer.height() / 2);

        this.inputManager.mousePosition.x = screenX / this.renderer.zoom + this.renderer.targetX;
        this.inputManager.mousePosition.y = screenY / this.renderer.zoom + this.renderer.targetY;
        this.inputManager.mousePosition.z = 0;
        this.hasMousePosition = true;
    }

    private getHoveredBody(renderItems?: RenderItem[], tolerance = BODY_HOVER_TOLERANCE_PIXELS): number | null {
        if (!this.hasMousePosition) return null;

        const hitTestRenderItems = renderItems ?? this.renderer.getRenderItems();
        const mouseScreenX = this.inputManager.mouseScreenPosition.x;
        const mouseScreenY = this.inputManager.mouseScreenPosition.y;

        for (let i = hitTestRenderItems.length - 1; i >= 0; i--) {
            const renderItem = hitTestRenderItems[i];
            const bodyId = bodyIds[renderItem.index];
            const style = this.bodyRenderStyles.get(bodyId) ?? DEFAULT_BODY_RENDER_STYLE;
            const dx = mouseScreenX - renderItem.x;
            const dy = mouseScreenY - renderItem.y;
            const hitRadius = style.renderRadius * renderItem.scale + tolerance;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq <= hitRadius * hitRadius) {
                return bodyId;
            }
        }

        return null;
    }

    private drawBodyPopup(renderItems: RenderItem[]): void {
        if (IS_TOUCH_DEVICE) {
            // There is no hover on touch screens: show the info of the followed body instead
            if (this.selectedPlanet === null || bodyIndexById[this.selectedPlanet] === undefined) return;
            this.drawBodyInfoPopup(this.selectedPlanet, true);
            return;
        }

        const bodyId = this.getHoveredBody(renderItems);
        if (bodyId === null) return;

        this.drawBodyInfoPopup(bodyId, false);
    }

    private drawBodyInfoPopup(bodyId: number, dockToBottom: boolean): void {
        const bodyIndex = bodyIndexById[bodyId];
        const style = this.bodyRenderStyles.get(bodyId);
        const bodyType = BodyType[bodyTypes[bodyIndex]];
        const type = bodyType[0] + bodyType.slice(1).toLowerCase();
        const title = style?.label || type;
        const pX = positionX[bodyIndex];
        const pY = positionY[bodyIndex];
        const pZ = positionZ[bodyIndex];

        const vX = velocityX[bodyIndex];
        const vY = velocityY[bodyIndex];
        const vZ = velocityZ[bodyIndex];

        const velocityMag = Math.sqrt(vX * vX + vY * vY + vZ * vZ);

        const rows: Array<[string, string]> = [
            ['Position', `x=${pX.toExponential(2)}, y=${pY.toExponential(2)}, z=${pZ.toExponential(2)} (km)`],
            ['Orbital speed', `${velocityMag.toFixed(2)} km/s`],
            ['Mass', `${mass[bodyIndex].toExponential(3)} kg`],
            ['Radius', `${radii[bodyIndex].toLocaleString(undefined, { maximumFractionDigits: 1 })} km`],
            ['Type', type],
        ];

        const width = BODY_POPUP_WIDTH;
        const height = BODY_POPUP_HEIGHT;
        const padding = 14;
        const imageSize = 54;
        const scale = this.getHudScale(width + 24, height + GUI.bottomBarHeight() + 24);
        let x: number;
        let y: number;

        if (dockToBottom) {
            // Centered above the bottom control bar
            x = (this.renderer.width() / scale - width) / 2;
            y = (this.renderer.height() - GUI.bottomBarHeight() - 12) / scale - height;
        } else {
            const mouseScreenX = this.inputManager.mouseScreenPosition.x;
            const mouseScreenY = this.inputManager.mouseScreenPosition.y;
            x = Math.max(12, Math.min(mouseScreenX + 18, this.renderer.width() - width - 12));
            y = Math.max(12, Math.min(mouseScreenY + 18, this.renderer.height() - height - 12));
        }

        this.renderer.pushScreenScale(scale);

        this.renderer.drawFillRect(x, y, width, height, 'rgba(10, 12, 16, 0.88)');
        this.renderer.drawStrokeRect(x, y, width, height, 'rgba(255, 255, 255, 0.18)');
        this.renderer.drawFillRect(x, y, width, 3, style?.fillColor || '#ffffff');

        if (style?.texture) {
            this.renderer.drawScreenTexture(x + padding, y + padding + 4, imageSize, imageSize, style.texture);
        } else {
            this.renderer.drawFillCircle(
                x + padding + imageSize / 2,
                y + padding + imageSize / 2 + 4,
                imageSize / 2,
                style?.fillColor || '#ffffff',
            );
        }

        this.renderer.drawText(title, x + padding + imageSize + 12, y + 28, 16, 'Arial', '#ffffff', 'left', 'middle');

        const rowsTop = y + padding + imageSize + 22;
        for (let i = 0; i < rows.length; i++) {
            const [label, value] = rows[i];
            const rowY = rowsTop + i * 22;

            this.renderer.drawText(
                label,
                x + padding,
                rowY,
                13,
                'Arial',
                'rgba(255, 255, 255, 0.72)',
                'left',
                'middle',
            );
            this.renderer.drawText(value, x + width - padding, rowY, 13, 'Arial', '#ffffff', 'right', 'middle');
        }

        this.renderer.popScreenScale();
    }

    private setDebug(value: boolean): void {
        this.debug = value;
    }

    private async stepSimulation(): Promise<void> {
        await this.engine.update(SETTINGS.dt);
        this.totalTime += SETTINGS.dt;
    }

    private adjustSimulationSpeed(key: '+' | '-', direction: 1 | -1, repeat: boolean): void {
        if (this.simulationSpeedKey !== key || !repeat) {
            this.simulationSpeedKey = key;
            this.simulationSpeedKeyPressedAt = performance.now();
        }

        const holdMs = performance.now() - this.simulationSpeedKeyPressedAt;
        const increment = 1 + Math.floor(holdMs / SIMULATION_SPEED_HOLD_STEP_MS);
        SETTINGS.simulationSpeed = Math.max(MIN_SIMULATION_SPEED, SETTINGS.simulationSpeed + direction * increment);
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
        this.panToBody(nextIndex);
        if (this.renderer.zoom < 1) {
            this.renderer.zoom = 1;
        }
        this.selectedPlanet = nextBodyId;
    }

    private panToBody(bodyIndex: number): void {
        const bodyId = bodyIds[bodyIndex];
        const style = this.bodyRenderStyles.get(bodyId) ?? DEFAULT_BODY_RENDER_STYLE;
        this.renderer.resolveBodyRenderPosition(bodyIndex, style);
        this.renderer.setCameraTarget(
            this.renderer.bodyRenderPositionX * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
            this.renderer.bodyRenderPositionY * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
            this.renderer.bodyRenderPositionZ * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
        );
    }

    private createBlackHoleAtMouse(): void {
        this.createBlackHoleAt(this.inputManager.mousePosition.x, this.inputManager.mousePosition.y);
    }

    /** Creates a black hole at the given world position (in rendering pixels) */
    private createBlackHoleAt(worldX: number, worldY: number): void {
        this.removeBlackHole();

        const x = worldX / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = worldY / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const blackHoleId = addNewBody(x, y, 0, BLACK_HOLE_RADIUS_KM, BLACK_HOLE_MASS_KG, BodyType.BLACK_HOLE);

        if (blackHoleId !== BODY_NOT_CREATED) {
            this.bodyRenderStyles.set(blackHoleId, {
                fillColor: '#030009',
                texture: AssetStore.getTexture('blackHole'),
                label: 'Black Hole',
                labelColor: '#d9b8ff',
                labelFontSize: 16,
                renderRadius: getBodyRenderRadius(BLACK_HOLE_RADIUS_KM, BodyType.STAR),
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
