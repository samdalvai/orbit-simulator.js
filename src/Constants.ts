export const FIXED_DELTA_TIME = 1 / 60;
export const MAX_BODIES = 5_000;

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6_371;
export const G = 6.6743e-20; // km^3 / kg / s^2

export const SETTINGS = {
    subSteps: 1,

    get dt() {
        return FIXED_DELTA_TIME / this.subSteps;
    },
};
