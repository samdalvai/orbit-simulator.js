#ifndef BODY_H
#define BODY_H

#include <stdint.h>
#include "constants.h"

enum BodyType
{
    STAR,
    PLANET,
    MOON,
    ASTEROID
};

extern uint32_t parents[MAX_BODIES];
extern uint32_t bodyTypes[MAX_BODIES];

extern double radiuses[MAX_BODIES];

// Linear motion
extern double posX[MAX_BODIES];
extern double posY[MAX_BODIES];
extern double velX[MAX_BODIES];
extern double velY[MAX_BODIES];
extern double accX[MAX_BODIES];
extern double accY[MAX_BODIES];

// Forces
extern double sumForcesX[MAX_BODIES];
extern double sumForcesY[MAX_BODIES];

// Mass
extern double masses[MAX_BODIES];
extern double invMasses[MAX_BODIES];

extern int bodyCount;

int getBodyCount();
void clearBodies();
int addNewBody(
    double x,
    double y,
    double radius,
    double mass,
    uint32_t bodyType,
    double velX,
    double velY,
    uint32_t parent);
int removeBody(int index);
void addForceXY(int id, double x, double y);
void clearForces(int id);
void initializeAcceleration(int id);
void integrateVerletPosition(int id, double dt);
void integrateVerletVelocity(int id, double dt);

#endif