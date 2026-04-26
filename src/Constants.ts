export const FIXED_DELTA_TIME = 1 / 60;
export const MAX_BODIES = 5_000;
export const GRAVITY = 9.8;

export const SETTINGS = {
    subSteps: 1,

    get dt() {
        return FIXED_DELTA_TIME / this.subSteps;
    },
};
