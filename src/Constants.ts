export const FIXED_DELTA_TIME = 1 / 60; // seconds
export const MAX_BODIES = 5_000;
export const SIMULATION_TIME_SCALE = 3_600 * 100; // 100 simulated hours per real second

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6_371;
export const G = 6.6743e-20; // km^3 / kg / s^2

export const PIXELS_PER_AU = 500;
export const PIXELS_PER_KM = PIXELS_PER_AU / AU_KM;
// Render radii are compressed so real km simulation values remain readable.
export const PIXEL_PER_KM_RADIUS = 6;
export const RADIUS_SCALE_EXPONENT = 0.35;

export const SETTINGS = {
    subSteps: 4,

    get dt() {
        return (FIXED_DELTA_TIME * SIMULATION_TIME_SCALE) / this.subSteps;
    },
};
