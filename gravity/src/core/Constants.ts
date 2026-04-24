export const FIXED_DELTA_TIME = 1 / 60;

export const PIXELS_PER_METER = 100;
export const MAX_BODIES = 5_000;
export const GRAVITY = 9.8;

export const MIN_BULLET_SPEED_SQUARED = 1_000_000;

export const SETTINGS = {
    // Simulation settings
    applyGravity: true,
    positionCorrection: true,
    impulseAccumulation: true,
    warmStarting: true,
    applyWarmStartingThreshold: true,
    blockSolve: true,
    ccd: true,

    // Thresholds and slops
    warmStartingThreshold: 0.5 * 0.5,
    contactMergeThreshold: 0.005 * 0.005,
    penetrationSlop: 0.5,
    restitutionSlop: 50,
    angularVelocitySlop: 0.05,
    positionCorrectionBeta: 0.2,
    contactSlop: 0.01, // Needed for roundoff errors in CCD making some collision not apply

    // Solver iterations fine tuning
    solverIterations: 10,
    subSteps: 1,

    get dt() {
        return FIXED_DELTA_TIME / this.subSteps;
    },

    get invDt() {
        return 1 / this.dt;
    },
};
