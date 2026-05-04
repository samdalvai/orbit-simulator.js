#include "body.h"
#include "constants.h"

#define NO_PARENT -1

int parents[MAX_BODIES];
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

int bodyCount = 0;

int getBodyCount()
{
    return bodyCount;
}

void clearBodies()
{
    bodyCount = 0;
}

int addNewBody(
    double x,
    double y,
    double radius,
    double mass,
    uint32_t bodyType,
    double vX,
    double vY,
    int parent)
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