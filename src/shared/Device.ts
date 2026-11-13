/**
 * Whether the primary input of the device is touch (phones, tablets).
 *
 * Used for performance settings and as the default for the mobile layout.
 */
export const IS_TOUCH_DEVICE =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches ||
        (navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches));

function getLayoutOverride(): 'mobile' | 'desktop' | null {
    if (typeof window === 'undefined') return null;

    const layout = new URLSearchParams(window.location.search).get('layout') ?? window.location.hash.slice(1);
    return layout === 'mobile' || layout === 'desktop' ? layout : null;
}

const LAYOUT_OVERRIDE = getLayoutOverride();

/**
 * Whether the user interface uses the mobile layout (full width control bar, touch controls help,
 * body info docked at the bottom). Defaults to touch devices, and can be forced with the
 * `?layout=mobile` / `?layout=desktop` URL parameter or the `#mobile` / `#desktop` hash.
 *
 * Performance related settings (body counts, physics steps, pixel ratio) follow `IS_TOUCH_DEVICE`
 * instead, since they depend on the hardware rather than on the layout.
 */
export const USE_MOBILE_LAYOUT = LAYOUT_OVERRIDE ? LAYOUT_OVERRIDE === 'mobile' : IS_TOUCH_DEVICE;

/** Screens narrower than this are considered compact and get a scaled down HUD. */
export const COMPACT_SCREEN_WIDTH = 600;

/**
 * Mobile CPUs are much slower than desktop ones and the gravity simulation is the bottleneck,
 * so scenarios generate fewer bodies on touch devices.
 */
export const MOBILE_BELT_BODIES_SCALE = 0.2;
export const MOBILE_GALAXY_SOLAR_SYSTEMS = 120;

/**
 * Maximum number of physics steps run per rendered frame on touch devices. When a frame is slow
 * the fixed time step loop would otherwise run more steps in the next frame, making it even slower.
 * Capping it slows the simulation down instead of freezing the app.
 */
export const MOBILE_MAX_PHYSICS_STEPS_PER_FRAME = 2;

/** Maximum device pixel ratio used for the canvas backing store on touch devices. */
export const MAX_DEVICE_PIXEL_RATIO = 2;
