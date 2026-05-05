#include "body.h"
#include "constants.h"

#define NO_PARENT -1

uint32_t parents[MAX_BODIES];
uint32_t bodyTypes[MAX_BODIES];

double radiuses[MAX_BODIES];

// Linear motion
double posX[MAX_BODIES];
double posY[MAX_BODIES];
double velX[MAX_BODIES];
double velY[MAX_BODIES];
double accX[MAX_BODIES];
double accY[MAX_BODIES];

// Forces
double sumForcesX[MAX_BODIES];
double sumForcesY[MAX_BODIES];

// Mass
double masses[MAX_BODIES];
double invMasses[MAX_BODIES];

uint32_t bodyCount = 0;

uint32_t getBodyCount()
{
    return bodyCount;
}

uint32_t getMaxBodies() {
    return MAX_BODIES;
}

void clearBodies()
{
    bodyCount = 0;
}

uint32_t addNewBody(
    double x,
    double y,
    double radius,
    double mass,
    uint32_t bodyType,
    double vX,
    double vY,
    uint32_t parent)
{

    // TODO: check we don't go out of bounds and that mass is > 0

    parents[bodyCount] = parent >= 0 ? parent : NO_PARENT;
    bodyTypes[bodyCount] = bodyType;
    radiuses[bodyCount] = radius;

    posX[bodyCount] = x;
    posY[bodyCount] = y;
    velX[bodyCount] = vX;
    velY[bodyCount] = vY;
    accX[bodyCount] = 0;
    accY[bodyCount] = 0;

    sumForcesX[bodyCount] = 0;
    sumForcesY[bodyCount] = 0;

    masses[bodyCount] = mass;
    invMasses[bodyCount] = 1 / mass;

    // Body index === id
    return bodyCount++;
}

uint32_t removeBody(int index)
{
    // Utils.assert(id >= 0 && id < bodyCount, 'Body id out of bounds');

    int lastIndex = bodyCount - 1;

    parents[index] = parents[lastIndex];
    bodyTypes[index] = bodyTypes[lastIndex];
    radiuses[index] = radiuses[lastIndex];

    posX[index] = posX[lastIndex];
    posY[index] = posY[lastIndex];
    velX[index] = velX[lastIndex];
    velY[index] = velY[lastIndex];
    accX[index] = accX[lastIndex];
    accY[index] = accY[lastIndex];

    sumForcesX[index] = sumForcesX[lastIndex];
    sumForcesY[index] = sumForcesY[lastIndex];

    masses[index] = masses[lastIndex];
    invMasses[index] = invMasses[lastIndex];

    bodyCount--;
    return index;
}

void addForceXY(int id, double x, double y)
{
    sumForcesX[id] += x;
    sumForcesY[id] += y;
}

void clearForces(int id)
{
    sumForcesX[id] = 0;
    sumForcesY[id] = 0;
}

void initializeAcceleration(int id)
{
    // Find the acceleration based on the forces that are being applied and the mass
    double invM = invMasses[id];
    accX[id] = sumForcesX[id] * invM;
    accY[id] = sumForcesY[id] * invM;

    // Clear all the forces and torque acting on the object before the next physics step
    clearForces(id);
}

void integrateVerletPosition(int id, double dt)
{
    double ax = accX[id];
    double ay = accY[id];

    posX[id] += velX[id] * dt + 0.5 * ax * dt * dt;
    posY[id] += velY[id] * dt + 0.5 * ay * dt * dt;
}

void integrateVerletVelocity(int id, double dt)
{
    double oldAx = accX[id];
    double oldAy = accY[id];

    double invM = invMasses[id];
    double newAx = sumForcesX[id] * invM;
    double newAy = sumForcesY[id] * invM;

    velX[id] += 0.5 * (oldAx + newAx) * dt;
    velY[id] += 0.5 * (oldAy + newAy) * dt;

    // store for next step
    accX[id] = newAx;
    accY[id] = newAy;

    clearForces(id);
}