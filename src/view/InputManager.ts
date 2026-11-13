import { Vec3 } from '../shared/Vec3';

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

export type TouchGesture =
    /** A single finger drag, movement in screen pixels since the previous gesture event */
    | { type: 'drag'; dx: number; dy: number }
    /** A two finger pinch/pan, centered at (x, y) with zoom factor and centroid movement */
    | { type: 'pinch'; x: number; y: number; factor: number; dx: number; dy: number }
    /** A short single finger tap without movement */
    | { type: 'tap'; x: number; y: number };

type TouchPoint = { x: number; y: number };

// Movement (in pixels) after which a touch is considered a drag rather than a tap
const TAP_MOVEMENT_TOLERANCE = 10;
const TAP_MAX_DURATION_MS = 350;
// Two finger centroid movement (in pixels) after which a pinch also pans the camera
const PINCH_PAN_THRESHOLD = 24;
// Browsers emit emulated mouse events after touches, ignore them for this time window
const EMULATED_MOUSE_EVENTS_WINDOW_MS = 800;

export default class InputManager {
    keyboardInputBuffer: KeyboardEvent[] = [];
    mouseInputBuffer: MouseEvent[] = [];
    mouseMoveBuffer: MouseEvent[] = [];
    mouseWheelBuffer: WheelEvent[] = [];
    touchGestureBuffer: TouchGesture[] = [];
    mousePosition = new Vec3();
    mouseScreenPosition = new Vec3();

    private lastWheelEventTime = 0;

    // Touch state
    private touches = new Map<number, TouchPoint>();
    private tapStart: { x: number; y: number; time: number } | null = null;
    private touchMoved = false;
    // Accumulated centroid movement of the current two finger gesture, until it becomes a pan
    private pinchPanX = 0;
    private pinchPanY = 0;
    private pinchPanning = false;
    private lastTouchTime = -Infinity;

    constructor() {
        window.addEventListener('keydown', this.handleKeyboardEvent);
        window.addEventListener('keyup', this.handleKeyboardEvent);

        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseClick);
        window.addEventListener('mouseup', this.handleMouseClick);

        window.addEventListener('wheel', this.handleWheelEvent);

        window.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointercancel', this.handlePointerUp);

        window.addEventListener('contextmenu', e => {
            e.preventDefault();
        });
    }

    private handleKeyboardEvent = (event: KeyboardEvent) => {
        if (event.key.startsWith('Arrow')) {
            event.preventDefault();
        }

        this.keyboardInputBuffer.push(event);
    };

    private isEmulatedMouseEvent(): boolean {
        return this.touches.size > 0 || performance.now() - this.lastTouchTime < EMULATED_MOUSE_EVENTS_WINDOW_MS;
    }

    private handleMouseMove = (event: MouseEvent) => {
        if (this.isEmulatedMouseEvent()) return;
        this.mouseMoveBuffer.push(event);
    };

    private handleMouseClick = (event: MouseEvent) => {
        if (this.isEmulatedMouseEvent()) return;
        this.mouseInputBuffer.push(event);
    };

    private handlePointerDown = (event: PointerEvent) => {
        if (event.pointerType === 'mouse') return;
        // Only gestures starting on the simulation canvas are handled (not on GUI controls)
        if (!(event.target instanceof HTMLCanvasElement)) return;

        event.preventDefault();
        this.lastTouchTime = performance.now();
        this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (this.touches.size === 1) {
            this.tapStart = { x: event.clientX, y: event.clientY, time: performance.now() };
            this.touchMoved = false;
        } else {
            // Multi touch gestures are never taps
            this.tapStart = null;
            this.touchMoved = true;
            this.pinchPanX = 0;
            this.pinchPanY = 0;
            this.pinchPanning = false;
        }
    };

    private handlePointerMove = (event: PointerEvent) => {
        const previous = this.touches.get(event.pointerId);
        if (!previous) return;

        event.preventDefault();
        this.lastTouchTime = performance.now();

        const current = { x: event.clientX, y: event.clientY };

        if (this.touches.size === 1) {
            this.touches.set(event.pointerId, current);

            if (!this.touchMoved && this.tapStart) {
                const totalDx = current.x - this.tapStart.x;
                const totalDy = current.y - this.tapStart.y;

                if (totalDx * totalDx + totalDy * totalDy < TAP_MOVEMENT_TOLERANCE * TAP_MOVEMENT_TOLERANCE) {
                    return;
                }

                this.touchMoved = true;
            }

            this.touchGestureBuffer.push({ type: 'drag', dx: current.x - previous.x, dy: current.y - previous.y });
            return;
        }

        const [first, second] = this.touches.keys();
        const before = this.getPinchState();
        this.touches.set(event.pointerId, current);

        if (event.pointerId !== first && event.pointerId !== second) return;

        const after = this.getPinchState();

        let dx = after.centerX - before.centerX;
        let dy = after.centerY - before.centerY;

        // Small centroid movements are expected while pinching, only pan once a clear drag is detected
        if (!this.pinchPanning) {
            this.pinchPanX += dx;
            this.pinchPanY += dy;

            if (Math.hypot(this.pinchPanX, this.pinchPanY) < PINCH_PAN_THRESHOLD) {
                dx = 0;
                dy = 0;
            } else {
                this.pinchPanning = true;
                dx = this.pinchPanX;
                dy = this.pinchPanY;
            }
        }

        this.touchGestureBuffer.push({
            type: 'pinch',
            x: after.centerX,
            y: after.centerY,
            factor: before.distance > 0 ? after.distance / before.distance : 1,
            dx,
            dy,
        });
    };

    private handlePointerUp = (event: PointerEvent) => {
        if (!this.touches.has(event.pointerId)) return;

        this.lastTouchTime = performance.now();
        this.touches.delete(event.pointerId);

        if (
            event.type === 'pointerup' &&
            this.touches.size === 0 &&
            this.tapStart &&
            !this.touchMoved &&
            performance.now() - this.tapStart.time <= TAP_MAX_DURATION_MS
        ) {
            this.touchGestureBuffer.push({ type: 'tap', x: this.tapStart.x, y: this.tapStart.y });
        }

        if (this.touches.size === 0) {
            this.tapStart = null;
        }
    };

    private getPinchState(): { centerX: number; centerY: number; distance: number } {
        const [a, b] = this.touches.values();
        return {
            centerX: (a.x + b.x) / 2,
            centerY: (a.y + b.y) / 2,
            distance: Math.hypot(a.x - b.x, a.y - b.y),
        };
    }

    private handleWheelEvent = (event: WheelEvent) => {
        // Wheel events for mousepads are triggered much faster compared to mouse wheels
        // whith this logic we prevent scrolling too fast on mouse pads
        if (performance.now() - this.lastWheelEventTime < 25) {
            return;
        }

        this.mouseWheelBuffer.push(event);
        this.lastWheelEventTime = performance.now();
    };
}
