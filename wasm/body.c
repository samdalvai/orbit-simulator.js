#include "body.h"
#include "constants.h"

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