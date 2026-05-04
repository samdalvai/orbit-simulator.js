import AssetStore from './AssetStore';
import { Body, BodyType } from './Body';
import { BodyRenderStyle } from './BodyRenderStyle';
import { FIXED_DELTA_TIME, KILOMETERS_TO_PIXELS_RENDERING_SCALE, MAX_BODIES, SETTINGS } from './Constants';
import InputManager, { MouseButton } from './InputManager';
import { clamp } from './Math';
import { bodyTypes, getBodyCount, ids, masses, radiuses, velX, velY } from './PackedBody';
import { Engine } from './PackedEngine';
import Graphics from './PackedGraphics';
import { createSolarSystem } from './PackedSolarSystem';
import { Vec2 } from './Vec2';

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
    private blackHole: number | null = null;
    private shortcutsOverlay: HTMLDivElement | null = null;
    private running = false;
    private paused = false;

    // Demos
    // private demoIndex = 1;

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

    // Need arrow function for callback to avoid explicit binding
    onBodySwap = (a: number, b: number): void => {
        const oldStyleA = this.bodyRenderStyles.get(a);
        const oldStyleB = this.bodyRenderStyles.get(b);

        if (oldStyleA) {
            this.bodyRenderStyles.set(b, oldStyleA);
        }

        if (oldStyleB) {
            this.bodyRenderStyles.set(a, oldStyleB);
        }
    };

    async setup(): Promise<void> {
        InputManager.initialize();

        await AssetStore.loadTextures();

        this.running = Graphics.openWindow();
        this.createShortcutsButton();
        this.loadDemo();
    }

    loadDemo() {
        this.engine.clear();
        this.blackHole = null;
        Graphics.pan.x = 0;
        Graphics.pan.y = 0;
        Graphics.zoom = 0.5;

        const solarSystem = createSolarSystem(this.engine);
        this.bodyRenderStyles = solarSystem.renderStyles;

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
        for (let i = 0; i < getBodyCount(); i++) {
            Graphics.drawBody(
                i,
                this.bodyRenderStyles.get(ids[i]),
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
            ['Bodies', `${this.engine.getBodiesCount()}/${MAX_BODIES}`],
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
                hoveredBody = i;
                bestDistanceSq = distanceSq;
            }
        }

        return hoveredBody;
    }

    private drawHoveredBodyPopup(): void {
        const bodyId = this.getHoveredBody();
        if (bodyId === null) return;

        const style = this.bodyRenderStyles.get(ids[bodyId]);
        const bodyType = BodyType[bodyTypes[bodyId]];
        const type = bodyType[0] + bodyType.slice(1).toLowerCase();
        const title = style?.label || type;
        const velocity = new Vec2(velX[bodyId], velY[bodyId]);

        const rows: Array<[string, string]> = [
            ['Orbital speed', `${velocity.magnitude().toFixed(2)} km/s`],
            ['Mass', `${masses[bodyId].toExponential(3)} kg`],
            ['Radius', `${radiuses[bodyId].toLocaleString(undefined, { maximumFractionDigits: 1 })} km`],
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

        if (getBodyCount() >= MAX_BODIES) {
            return;
        }

        const x = InputManager.mousePosition.x / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = InputManager.mousePosition.y / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const blackHole = new Body(x, y, BLACK_HOLE_RADIUS_KM, BLACK_HOLE_MASS_KG, BodyType.STAR);
        const blackHoleId = this.engine.addBody(blackHole);

        if (blackHoleId === null) {
            return;
        }

        this.bodyRenderStyles.set(blackHoleId, {
            fillColor: '#030009',
            texture: AssetStore.getTexture('blackHole'),
            label: 'Black Hole',
            labelColor: '#d9b8ff',
            labelFontSize: 16,
        });

        this.blackHole = blackHoleId;
    }

    private removeBlackHole(): void {
        if (this.blackHole === null) {
            return;
        }

        // TODO: to be updated by subsituting style
        const oldBlackHoleId = this.engine.deleteBody(this.blackHole);
        this.bodyRenderStyles.delete(oldBlackHoleId);

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
