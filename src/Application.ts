import AssetStore from './AssetStore';
import { Body, BodyType } from './Body';
import { BodyRenderStyle } from './BodyRenderStyle';
import { FIXED_DELTA_TIME, KILOMETERS_TO_PIXELS_RENDERING_SCALE, MAX_BODIES, SETTINGS } from './Constants';
import { Engine } from './Engine';
import Graphics from './Graphics';
import InputManager, { MouseButton } from './InputManager';
import { clamp } from './Math';
import { createAlphaCentauriSystem, createSolarSystem } from './SolarSystem';

const BLACK_HOLE_RADIUS_KM = 220_000;
const BLACK_HOLE_MASS_KG = 8e30;
const BODY_HOVER_TOLERANCE_PIXELS = 10;

const SHORTCUTS: Array<[string, string]> = [
    ['L', 'Toggle labels'],
    ['D', 'Toggle debug panel'],
    ['T', 'Toggle textures'],
    ['M', 'Toggle moon labels'],
    ['P', 'Pause / resume'],
    ['.', 'Step simulation'],
    [',', 'Reverse simulation step'],
    ['*', 'Increase substeps'],
    ['/', 'Decrease substeps'],
    ['Shift + R', 'Reset solar system'],
    ['B', 'Create black hole at mouse'],
    ['Shift + B', 'Remove black hole'],
    ['Mouse wheel', 'Zoom'],
    ['Middle drag / Cmd drag', 'Pan camera'],
];

export default class Application {
    private engine: Engine;
    private bodyRenderStyles = new Map<number, BodyRenderStyle>();
    private blackHole: Body | null = null;
    private shortcutsOverlay: HTMLDivElement | null = null;
    private running = false;
    private paused = false;

    // Demos
    private demoIndex = 1;

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
    private showMoonLabels = false;
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
        this.createShortcutsButton();
        this.loadDemo();
    }

    loadDemo() {
        this.engine.clear();
        this.bodyRenderStyles.clear();
        this.blackHole = null;

        Graphics.pan.x = 0;
        Graphics.pan.y = 0;
        Graphics.zoom = 0.5;

        if (this.demoIndex === 1) {
            const solarSystem = createSolarSystem(this.engine);
            this.bodyRenderStyles = solarSystem.renderStyles;
        }

        if (this.demoIndex === 2) {
            Graphics.zoom = 0.2;
            const solarSystem = createAlphaCentauriSystem(this.engine);
            this.bodyRenderStyles = solarSystem.renderStyles;
        }

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

                    if (inputEvent.key === '1') {
                        this.demoIndex = 1;
                        this.loadDemo();
                    }

                    if (inputEvent.key === '2') {
                        this.demoIndex = 2;
                        this.loadDemo();
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

                    if (key === 'r' && inputEvent.shiftKey) {
                        this.loadDemo();
                    }

                    if (inputEvent.code === 'MetaLeft') {
                        this.controlPressed = true;
                    }

                    if (inputEvent.code === 'Space') {
                        for (const body of this.engine.getBodies()) {
                            if (body.bodyType === BodyType.PLANET) {
                                const pos = Graphics.getBodyRenderPosition(body).scaleNew(
                                    KILOMETERS_TO_PIXELS_RENDERING_SCALE,
                                );
                                Graphics.pan = pos;
                                break;
                            }
                        }
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

        const viewport = Graphics.getRenderViewport();

        // Draw all bodies
        for (const body of this.engine.getBodies()) {
            Graphics.drawBody(
                body,
                this.bodyRenderStyles.get(body.id),
                this.showTextures,
                this.showLabels,
                this.showMoonLabels,
                viewport,
            );
        }

        // Graphics.drawLine(-50, 0, 50, 0, 'rgba(200, 200, 200, 0.5');
        // Graphics.drawLine(0, -50, 0, 50, 'rgba(200, 200, 200, 0.5');

        Graphics.endWorld();

        if (!this.debug) {
            this.drawHoveredBodyPopup();
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
            ['Labels', this.showLabels ? 'ON' : 'OFF'],
            ['Moon labels', this.showMoonLabels ? 'ON' : 'OFF'],
            ['Mouse (x)', `${(x / KILOMETERS_TO_PIXELS_RENDERING_SCALE).toExponential(5)} km`],
            ['Mouse (y)', `${(y / KILOMETERS_TO_PIXELS_RENDERING_SCALE).toExponential(5)} km`],
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

        this.drawHoveredBodyPopup();
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
        this.hasMousePosition = true;
    }

    private getHoveredBody(): Body | null {
        if (!this.hasMousePosition) return null;

        let hoveredBody: Body | null = null;
        let bestDistanceSq = Number.POSITIVE_INFINITY;
        const tolerance = BODY_HOVER_TOLERANCE_PIXELS / Graphics.zoom;

        for (const body of this.engine.getBodies()) {
            const renderPosition = Graphics.getBodyRenderPosition(body);
            const x = renderPosition.x * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
            const y = renderPosition.y * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
            const dx = InputManager.mousePosition.x - x;
            const dy = InputManager.mousePosition.y - y;
            const hitRadius = Graphics.getBodyRenderRadius(body) + tolerance;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq <= hitRadius * hitRadius && distanceSq < bestDistanceSq) {
                hoveredBody = body;
                bestDistanceSq = distanceSq;
            }
        }

        return hoveredBody;
    }

    private drawHoveredBodyPopup(): void {
        const body = this.getHoveredBody();
        if (!body) return;

        const style = this.bodyRenderStyles.get(body.id);
        const bodyType = BodyType[body.bodyType];
        const type = bodyType[0] + bodyType.slice(1).toLowerCase();
        const title = style?.label || type;
        const rows: Array<[string, string]> = [
            ['Orbital speed', `${body.velocity.magnitude().toFixed(2)} km/s`],
            ['Mass', `${body.mass.toExponential(3)} kg`],
            ['Radius', `${body.radius.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`],
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

    private createBlackHoleAtMouse(): void {
        this.removeBlackHole();

        if (this.engine.getBodies().length >= MAX_BODIES) {
            return;
        }

        const x = InputManager.mousePosition.x / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = InputManager.mousePosition.y / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const blackHole = new Body(x, y, BLACK_HOLE_RADIUS_KM, BLACK_HOLE_MASS_KG, BodyType.STAR);

        this.engine.addBody(blackHole);
        this.bodyRenderStyles.set(blackHole.id, {
            fillColor: '#030009',
            texture: AssetStore.getTexture('blackHole'),
            label: 'Black Hole',
            labelColor: '#d9b8ff',
            labelFontSize: 16,
        });

        this.blackHole = blackHole;
    }

    private removeBlackHole(): void {
        if (!this.blackHole) {
            return;
        }

        this.engine.removeBody(this.blackHole);
        this.bodyRenderStyles.delete(this.blackHole.id);
        this.blackHole = null;
    }

    private createShortcutsButton(): void {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '?';
        button.title = 'Show shortcuts';
        button.ariaLabel = 'Show shortcuts';

        Object.assign(button.style, {
            position: 'fixed',
            top: '16px',
            right: '18px',
            zIndex: '10',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            background: 'rgba(10, 12, 16, 0.78)',
            color: '#ffffff',
            cursor: 'pointer',
            font: '700 20px Arial, sans-serif',
            lineHeight: '34px',
            padding: '0',
        });

        button.addEventListener('mousedown', event => {
            event.stopPropagation();
        });
        button.addEventListener('click', event => {
            event.stopPropagation();
            this.showShortcuts();
        });

        document.body.appendChild(button);
    }

    private showShortcuts(): void {
        if (this.shortcutsOverlay) {
            this.shortcutsOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.55)',
            padding: '24px',
        });

        const modal = document.createElement('section');
        Object.assign(modal.style, {
            width: 'min(520px, 100%)',
            maxHeight: 'min(680px, calc(100vh - 48px))',
            overflow: 'auto',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            background: 'rgba(10, 12, 16, 0.94)',
            boxShadow: '0 18px 60px rgba(0, 0, 0, 0.55)',
            padding: '20px 22px 22px',
        });

        const title = document.createElement('h2');
        title.textContent = 'Shortcuts';
        Object.assign(title.style, {
            margin: '0 0 16px',
            color: '#ffb15c',
            font: '700 18px Arial, sans-serif',
        });

        const list = document.createElement('dl');
        Object.assign(list.style, {
            display: 'grid',
            gridTemplateColumns: 'minmax(128px, max-content) 1fr',
            gap: '10px 18px',
            margin: '0',
            color: '#ffffff',
            font: '14px Arial, sans-serif',
        });

        for (const [keys, action] of SHORTCUTS) {
            const term = document.createElement('dt');
            const key = document.createElement('kbd');
            key.textContent = keys;
            Object.assign(key.style, {
                display: 'inline-block',
                minWidth: '28px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                font: '700 13px Arial, sans-serif',
                textAlign: 'center',
            });
            term.appendChild(key);

            const description = document.createElement('dd');
            description.textContent = action;
            Object.assign(description.style, {
                margin: '0',
                color: 'rgba(255, 255, 255, 0.78)',
                lineHeight: '24px',
            });

            list.append(term, description);
        }

        modal.append(title, list);
        modal.addEventListener('mousedown', event => {
            event.stopPropagation();
        });

        overlay.addEventListener('mousedown', event => {
            event.stopPropagation();
            if (event.target === overlay) {
                this.hideShortcuts();
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.shortcutsOverlay = overlay;
    }

    private hideShortcuts(): void {
        this.shortcutsOverlay?.remove();
        this.shortcutsOverlay = null;
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
