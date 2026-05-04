#ifndef CONSTANTS_H
#define CONSTANTS_H

#define MAX_BODIES 10000

static const double G = 6.6743e-20;

static const double FIXED_DELTA_TIME = 1.0 / 60.0;         // seconds
static const double SIMULATION_TIME_SCALE = 3600.0 * 10.0; // 10 simulated hours per real second

static inline double simulation_dt(void)
{
    return FIXED_DELTA_TIME * SIMULATION_TIME_SCALE;
}

#endif