export const FIXED_DELTA_TIME = 1 / 60; // seconds
export const MAX_BODIES = 10_000;
// TODO: decrease to 10 hours from 100 because fast movin moons (e.g Phobos are not well simulated)
export const SIMULATION_TIME_SCALE = 3_600 * 5; // 10 simulated hours per real second

/** Gravitational constant */
export const G = 6.6743e-20; // km^3 / kg / s^2

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6_371;
export const SOLAR_MASS_KG = 1.98847e30;

// Orbit/distance rendering scales.
export const PLANET_ORBIT_RENDERING_SCALE = 500; // pixels per AU
// export const KILOMETERS_TO_PIXELS_RENDERING_SCALE = PLANET_ORBIT_RENDERING_SCALE / AU_KM;
export const KILOMETERS_TO_PIXELS_RENDERING_SCALE = 1;
export const MOON_ORBIT_RENDERING_SCALE = 24; // parent-relative moon orbit exaggeration
export const MIN_MOON_ORBIT_RENDERING_GAP = 8; // pixels between rendered parent and moon

// Radius rendering scales. Physical radii are compressed by the exponent below.
export const RADIUS_RENDERING_EXPONENT = 0.35;
export const MIN_BODY_RENDERING_RADIUS = 2;
export const ASTEROID_MIN_RENDERING_RADIUS = 5;
export const STAR_RADIUS_RENDERING_SCALE = 6;
export const PLANET_RADIUS_RENDERING_SCALE = 6;
export const MOON_RADIUS_RENDERING_SCALE = 6;
export const ASTEROID_RADIUS_RENDERING_SCALE = 8;

export const SETTINGS = {
    subSteps: 1,

    get dt() {
        return (FIXED_DELTA_TIME * SIMULATION_TIME_SCALE) / this.subSteps;
    },
};
