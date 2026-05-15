import { createSolarSystem } from '../scenarios/BodyGeneration';
import { createRandomGalaxy } from '../scenarios/RandomGalaxy';
import { createRandomSolarSystem } from '../scenarios/RandomSolarSystem';
import { solarSystem } from '../scenarios/SolarSystem';
import { testSystem } from '../scenarios/TestSystem';
import { tripleStarSystem } from '../scenarios/TripleStarSystem';
import { FIXED_DELTA_TIME, KILOMETERS_TO_PIXELS_RENDERING_SCALE, MAX_BODIES, SETTINGS } from '../shared/Constants';
import { clamp, randomNumber } from '../shared/Math';
import { formatDuration } from '../shared/Utils';
import { Vec2 } from '../shared/Vec2';
import {
    BodyType,
    addNewBody,
    bodyIds,
    bodyIndexById,
    bodyTypes,
    getBodyCount,
    mass,
    positionX,
    positionY,
    radii,
    removeBody,
    velocityX,
    velocityY,
} from '../sim/Body';
import { getDebrisCount } from '../sim/Collision';
import { Engine } from '../sim/Engine';
import AssetStore from '../view/AssetStore';
import { BodyRenderStyle, DEFAULT_BODY_RENDER_STYLE, getBodyRenderRadius } from '../view/BodyRenderStyle';
import GUI from '../view/GUI';
import InputManager, { MouseButton } from '../view/InputManager';
import Renderer from '../view/Renderer';

const BLACK_HOLE_RADIUS_KM = 220_000;
const BLACK_HOLE_MASS_KG = 8e30;
const BODY_HOVER_TOLERANCE_PIXELS = 10;

const DEMO_LABELS = ['Solar system', 'Triple star system', 'Random system', 'Random galaxy'];

export default class Application {
    private engine: Engine;
    private renderer: Renderer;
    private inputManager: InputManager;

    private bodyRenderStyles = new Map<number, BodyRenderStyle>();
    private running = false;
    private paused = false;

    // Demos
    private demoIndex = 5;
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
        GUI.initialize();

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

            this.renderer.pan.x = 0;
            this.renderer.pan.y = 0;

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
                const randomSolarSystemSpec = createRandomSolarSystem();
                createSolarSystem(randomSolarSystemSpec, this.bodyRenderStyles);
            }

            if (this.demoIndex === 4) {
                this.renderer.zoom = 0.01;
                createRandomGalaxy(this.bodyRenderStyles);
            }

            if (this.demoIndex === 5) {
                this.renderer.zoom = 0.00005;
                createSolarSystem(testSystem, this.bodyRenderStyles);
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
                        for (const [id, style] of this.bodyRenderStyles) {
                            // if (style.label === 'Moon') {
                            const index = bodyIndexById[id];
                            const radius = radii[index];
                            const bodyMass = mass[index];

                            const posX = positionX[index];
                            const posY = positionY[index];
                            const velX = velocityX[index];
                            const velY = velocityY[index];
                            const bodyType = bodyTypes[index];

                            if (bodyType === BodyType.ASTEROID) continue;

                            const numOfDebries = getDebrisCount(
                                radius,
                                1, // 1 km
                                radius, // star radius
                                4,
                                25,
                            );

                            const circlesRadius = radius / Math.sqrt(numOfDebries);
                            const circles = this.createHoneycombInCircle(radius, circlesRadius);
                            const circlesMass = bodyMass / circles.length;

                            // console.log('main raadius: ', radius);
                            // console.log('main mass: ', bodyMass);

                            // console.log('circlesRadius: ', circlesRadius);
                            // console.log('circles: ', circles);
                            // console.log('circles mass: ', circlesMass);
                            const colors = ['#8f7a66', '#6f6258', '#a08b72', '#5a514c'];

                            for (const c of circles) {
                                const debrisId = addNewBody(
                                    posX + c.x,
                                    posY + c.y,
                                    circlesRadius,
                                    circlesMass,
                                    BodyType.ASTEROID,
                                    new Vec2(velX, velY),
                                );
                                const colorIndex = Math.floor(Math.random() * 4);
                                console.log('Color index: ', colorIndex);
                                this.bodyRenderStyles.set(debrisId, {
                                    fillColor: colors[colorIndex],
                                    texture: null,
                                    label: '',
                                    labelColor: '',
                                    labelFontSize: 0,
                                    renderRadius: (style.renderRadius / radius) * circlesRadius,
                                });
                            }

                            removeBody(id);
                            this.bodyRenderStyles.delete(id);

                            // const newId = addNewBody(
                            //     // c.x,
                            //     // c.y,
                            //     randomNumber(-1000000, 1000000) * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
                            //     randomNumber(-1000000, 1000000) * KILOMETERS_TO_PIXELS_RENDERING_SCALE,
                            //     695_700,
                            //     circlesMass,
                            //     bodyType,
                            //     new Vec2(velX, velY),
                            // );

                            // this.bodyRenderStyles.set(newId, {
                            //     fillColor: style.fillColor,
                            //     texture: null,
                            //     label: '',
                            //     labelColor: '',
                            //     labelFontSize: 0,
                            //     renderRadius: 695_700,
                            // });

                            // const debRadius = radius / 2;
                            // const posX1 = posX - debRadius;
                            // const posX2 = posX + debRadius;
                            // const posY3 = posY - debRadius * Math.sqrt(3);
                            // const posY4 = posY + debRadius * Math.sqrt(3);

                            // // Test debries near to each other, 2 debries
                            // const debris1 = addNewBody(
                            //     posX1,
                            //     posY,
                            //     radius / 2,
                            //     bodyMass / 2,
                            //     BodyType.STAR,
                            //     new Vec2(velX, velY),
                            // );
                            // const debris2 = addNewBody(
                            //     posX2,
                            //     posY,
                            //     radius / 2,
                            //     bodyMass / 2,
                            //     BodyType.STAR,
                            //     new Vec2(velX, velY),
                            // );
                            // const debris3 = addNewBody(
                            //     posX,
                            //     posY3,
                            //     radius / 2,
                            //     bodyMass / 2,
                            //     BodyType.STAR,
                            //     new Vec2(velX, velY),
                            // );
                            // const debris4 = addNewBody(
                            //     posX,
                            //     posY4,
                            //     radius / 2,
                            //     bodyMass / 2,
                            //     BodyType.STAR,
                            //     new Vec2(velX, velY),
                            // );

                            // // console.log('pos 1: ', posX1);
                            // // console.log('pos 2: ', posX2);

                            // this.bodyRenderStyles.set(debris1, {
                            //     fillColor: style.fillColor,
                            //     texture: null,
                            //     label: '',
                            //     labelColor: '',
                            //     labelFontSize: 0,
                            //     renderRadius: 1,
                            // });
                            // this.bodyRenderStyles.set(debris2, {
                            //     fillColor: style.fillColor,
                            //     texture: null,
                            //     label: '',
                            //     labelColor: '',
                            //     labelFontSize: 0,
                            //     renderRadius: 1,
                            // });
                            // this.bodyRenderStyles.set(debris3, {
                            //     fillColor: style.fillColor,
                            //     texture: null,
                            //     label: '',
                            //     labelColor: '',
                            //     labelFontSize: 0,
                            //     renderRadius: 1,
                            // });
                            // this.bodyRenderStyles.set(debris4, {
                            //     fillColor: style.fillColor,
                            //     texture: null,
                            //     label: '',
                            //     labelColor: '',
                            //     labelFontSize: 0,
                            //     renderRadius: 1,
                            // });

                            break;

                            // }
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
        while (this.inputManager.mouseMoveBuffer.length > 0) {
            const inputEvent = this.inputManager.mouseMoveBuffer.shift();
            if (!inputEvent) return;

            if (this.middleMousePressed || this.controlPressed) {
                document.body.style.cursor = 'pointer';
                // Drag the camera opposite to mouse movement
                this.renderer.pan.x -= inputEvent.movementX / this.renderer.zoom;
                this.renderer.pan.y += inputEvent.movementY / this.renderer.zoom;
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
                        if (this.selectedPlanet) {
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
        while (this.inputManager.mouseWheelBuffer.length > 0) {
            const inputEvent = this.inputManager.mouseWheelBuffer.shift();
            if (!inputEvent) return;

            this.renderer.zoomAt(inputEvent.x, inputEvent.y, inputEvent.deltaY > 0 ? 1 / 1.1 : 1.1);
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

    createHoneycombCircles(radius: number, rings: number): Vec2[] {
        const points: Vec2[] = [];

        points.push(new Vec2());

        const directions = [
            { q: -1, s: 1 },
            { q: -1, s: 0 },
            { q: 0, s: -1 },
            { q: 1, s: -1 },
            { q: 1, s: 0 },
            { q: 0, s: 1 },
        ];

        for (let ring = 1; ring <= rings; ring++) {
            let q = ring;
            let s = 0;

            for (const dir of directions) {
                for (let step = 0; step < ring; step++) {
                    const x = radius * 2 * (q + s / 2);
                    const y = radius * Math.sqrt(3) * s;

                    points.push(new Vec2(x, y));

                    q += dir.q;
                    s += dir.s;
                }
            }
        }

        return points;
    }

    createHoneycombInCircle(circleRadius: number, bodyRadius: number): Vec2[] {
        const points: Vec2[] = [];

        const maxRings = Math.ceil(circleRadius / (bodyRadius * 2));

        const candidates = this.createHoneycombCircles(bodyRadius, maxRings);

        for (const p of candidates) {
            if (Math.hypot(p.x, p.y) + bodyRadius <= circleRadius) {
                points.push(p);
            }
        }

        return points;
    }

    render(): void {
        this.renderer.clearScreen();
        this.renderer.updateViewport();

        if (this.selectedPlanet !== null) {
            const index = bodyIndexById[this.selectedPlanet];
            this.panToBody(index);
        }

        this.renderer.beginWorld();

        // const areaRadius = 695_700;
        // const numOfDebries = getDebrisCount(
        //     areaRadius,
        //     1, // 1 km
        //     areaRadius, // star radius
        //     4,
        //     25,
        // );

        // const circlesRadius = areaRadius / Math.sqrt(numOfDebries);

        // const circles = this.createHoneycombInCircle(areaRadius, circlesRadius);
        // for (const c of circles) {
        //     this.renderer.drawCircle(c.x, c.y, circlesRadius, 'white');
        // }

        // this.renderer.drawCircle(0, 0, areaRadius, 'red');

        if (this.showTextures) {
            for (let i = 0; i < getBodyCount(); i++) {
                this.renderer.drawStarGlow(i);
            }
        }

        // Draw all bodies
        for (let i = 0; i < getBodyCount(); i++) {
            this.renderer.drawBody(i, this.showTextures, this.showLabels, this.showMoonLabels);
        }

        this.renderer.endWorld();

        if (!this.debug) {
            this.drawHoveredBodyPopup();
            return;
        }

        const x = this.inputManager.mousePosition.x;
        const y = this.inputManager.mousePosition.y;
        const simulationSecondsPerSecond = (SETTINGS.dt * SETTINGS.subSteps) / FIXED_DELTA_TIME;

        const stats: Array<[string, string]> = [
            ['Demo', DEMO_LABELS[this.demoIndex - 1]],
            ['Paused', this.paused ? 'ON' : 'OFF'],
            ['Bodies', `${getBodyCount()}/${MAX_BODIES}`],
            ['FPS', this.FPS.toFixed(2)],
            ['Zoom', this.renderer.zoom.toFixed(4)],
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

        this.drawHoveredBodyPopup();
    }

    private updateMouseWorldPosition(inputEvent: MouseEvent): void {
        const screenX = inputEvent.x - this.renderer.width() / 2;
        const screenY = -(inputEvent.y - this.renderer.height() / 2);

        this.inputManager.mousePosition.x = screenX / this.renderer.zoom + this.renderer.pan.x;
        this.inputManager.mousePosition.y = screenY / this.renderer.zoom + this.renderer.pan.y;
        this.hasMousePosition = true;
    }

    private getHoveredBody(): number | null {
        if (!this.hasMousePosition) return null;

        let hoveredBody: number | null = null;
        let bestDistanceSq = Number.POSITIVE_INFINITY;
        const tolerance = BODY_HOVER_TOLERANCE_PIXELS / this.renderer.zoom;

        for (let i = 0; i < getBodyCount(); i++) {
            const bodyId = bodyIds[i];
            const style = this.bodyRenderStyles.get(bodyId) ?? DEFAULT_BODY_RENDER_STYLE;
            this.renderer.resolveBodyRenderPosition(i, style);
            const x = this.renderer.bodyRenderPositionX * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
            const y = this.renderer.bodyRenderPositionY * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
            const dx = this.inputManager.mousePosition.x - x;
            const dy = this.inputManager.mousePosition.y - y;
            const hitRadius = style.renderRadius + tolerance;
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
        const pX = positionX[bodyIndex];
        const pY = positionY[bodyIndex];
        const vX = velocityX[bodyIndex];
        const vY = velocityY[bodyIndex];
        const velocityMag = Math.sqrt(vX * vX + vY * vY);
        const rows: Array<[string, string]> = [
            ['Position', `x=${pX.toExponential(2)}, y=${pY.toExponential(2)} (km)`],
            ['Orbital speed', `${velocityMag.toFixed(2)} km/s`],
            ['Mass', `${mass[bodyIndex].toExponential(3)} kg`],
            ['Radius', `${radii[bodyIndex].toLocaleString(undefined, { maximumFractionDigits: 1 })} km`],
            ['Type', type],
        ];

        const width = 300;
        const height = 200;
        const padding = 14;
        const imageSize = 54;
        const mouseScreenX =
            (this.inputManager.mousePosition.x - this.renderer.pan.x) * this.renderer.zoom + this.renderer.width() / 2;
        const mouseScreenY =
            this.renderer.height() / 2 - (this.inputManager.mousePosition.y - this.renderer.pan.y) * this.renderer.zoom;
        const x = Math.max(12, Math.min(mouseScreenX + 18, this.renderer.width() - width - 12));
        const y = Math.max(12, Math.min(mouseScreenY + 18, this.renderer.height() - height - 12));

        this.renderer.drawFillRect(x, y, width, height, 'rgba(10, 12, 16, 0.88)');
        this.renderer.drawStrokeRect(x, y, width, height, 'rgba(255, 255, 255, 0.18)');
        this.renderer.drawFillRect(x, y, width, 3, style?.fillColor || '#ffffff');

        if (style?.texture) {
            this.renderer.ctx.drawImage(style.texture, x + padding, y + padding + 4, imageSize, imageSize);
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
        this.renderer.pan.x = this.renderer.bodyRenderPositionX * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        this.renderer.pan.y = this.renderer.bodyRenderPositionY * KILOMETERS_TO_PIXELS_RENDERING_SCALE;
    }

    private createBlackHoleAtMouse(): void {
        this.removeBlackHole();

        const x = this.inputManager.mousePosition.x / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const y = this.inputManager.mousePosition.y / KILOMETERS_TO_PIXELS_RENDERING_SCALE;
        const blackHoleId = addNewBody(x, y, BLACK_HOLE_RADIUS_KM, BLACK_HOLE_MASS_KG, BodyType.STAR);

        if (blackHoleId !== null) {
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
