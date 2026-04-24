import { Vec2 } from '../../src';

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

export default class InputManager {
    static keyboardInputBuffer: KeyboardEvent[];
    static mouseInputBuffer: MouseEvent[];
    static mouseMoveBuffer: MouseEvent[];
    static mouseWheelBuffer: MouseEvent[];
    static mousePosition: Vec2;

    static lastWheelEventTime = 0;

    static initialize = () => {
        this.keyboardInputBuffer = [];
        this.mouseInputBuffer = [];
        this.mouseMoveBuffer = [];
        this.mouseWheelBuffer = [];
        this.mousePosition = new Vec2();

        window.addEventListener('keydown', this.handleKeyboardEvent);
        window.addEventListener('keyup', this.handleKeyboardEvent);

        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseClick);
        window.addEventListener('mouseup', this.handleMouseClick);

        window.addEventListener('wheel', this.handleWheelEvent);

        window.addEventListener('contextmenu', e => {
            e.preventDefault();
        });
    };

    static isUiEventTarget = (target: EventTarget | null) => {
        return target instanceof Element && target.closest('#demo-toolbar, #demo-shortcuts-modal') !== null;
    };

    static handleKeyboardEvent = (event: KeyboardEvent) => {
        if (event.type === 'keydown' && this.isUiEventTarget(event.target)) {
            return;
        }

        this.keyboardInputBuffer.push(event);
    };

    static handleMouseMove = (event: MouseEvent) => {
        if (this.isUiEventTarget(event.target)) {
            return;
        }

        this.mouseMoveBuffer.push(event);
    };

    static handleMouseClick = (event: MouseEvent) => {
        if (event.type === 'mousedown' && this.isUiEventTarget(event.target)) {
            return;
        }

        this.mouseInputBuffer.push(event);
    };

    static handleWheelEvent = (event: MouseEvent) => {
        if (this.isUiEventTarget(event.target)) {
            return;
        }

        // Wheel events for mousepads are triggered much faster compared to mouse wheels
        // whith this logic we prevent scrolling too fast on mouse pads
        if (performance.now() - this.lastWheelEventTime < 25) {
            return;
        }

        this.mouseWheelBuffer.push(event);
        this.lastWheelEventTime = performance.now();
    };
}
