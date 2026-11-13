/**
 * Whether the primary input of the device is touch (phones, tablets).
 *
 * Used to enable touch gestures, the on-screen control bar and the mobile layout.
 */
export const IS_TOUCH_DEVICE =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches ||
        (navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches));

/** Screens narrower than this are considered compact and get a scaled down HUD. */
export const COMPACT_SCREEN_WIDTH = 600;

/** Maximum device pixel ratio used for the canvas backing store on touch devices. */
export const MAX_DEVICE_PIXEL_RATIO = 2;
