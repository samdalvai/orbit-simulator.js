import { Vec3 } from '../shared/Vec3';

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

export default class InputManager {
    keyboardInputBuffer: KeyboardEvent[] = [];
    mouseInputBuffer: MouseEvent[] = [];
    mouseMoveBuffer: MouseEvent[] = [];
    mouseWheelBuffer: WheelEvent[] = [];
    mousePosition = new Vec3();
    mouseScreenPosition = new Vec3();

    private lastWheelEventTime = 0;

    constructor() {
        window.addEventListener('keydown', this.handleKeyboardEvent);
        window.addEventListener('keyup', this.handleKeyboardEvent);

        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseClick);
        window.addEventListener('mouseup', this.handleMouseClick);

        window.addEventListener('wheel', this.handleWheelEvent);

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

    private handleMouseMove = (event: MouseEvent) => {
        this.mouseMoveBuffer.push(event);
    };

    private handleMouseClick = (event: MouseEvent) => {
        this.mouseInputBuffer.push(event);
    };

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
