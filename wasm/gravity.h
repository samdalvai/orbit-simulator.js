#ifndef GRAVITY_H
#define GRAVITY_H

#define DEFAULT_THETA 0.5
#define DEFAULT_EPSILON 1.0

int applyBarnesHutGravitationalForces(
    double G,
    double theta,
    double epsilon);

#endif