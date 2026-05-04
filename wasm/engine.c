#include "engine.h"
#include "body.h"
#include "gravity.h"

#define MAX_BODIES 10000
#define G 6.6743e-20

void update(double dt)
{
    int bodyCount = getBodyCount();

    for (int i = 0; i < bodyCount; i++)
    {
        integrateVerletPosition(i, dt);
    }

    clearAllForces();
    applyBarnesHutGravitationalForces(G, DEFAULT_THETA, DEFAULT_EPSILON);

    for (int i = 0; i < bodyCount; i++)
    {
        integrateVerletVelocity(i, dt);
    }
}

void initializeVerlet()
{
    clearAllForces();
    applyBarnesHutGravitationalForces(G, DEFAULT_THETA, DEFAULT_EPSILON);

    for (int i = 0; i < getBodyCount(); i++)
    {
        initializeAcceleration(i);
    }
}

void clearAllForces()
{
    for (int i = 0; i < getBodyCount(); i++)
    {
        clearForces(i);
    }
}