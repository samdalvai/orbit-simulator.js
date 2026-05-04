#include "engine.h"
#include "body.h"
#include "gravity.h"
#include "quad_tree.h"

int update(double dt)
{
    int bodyCount = getBodyCount();

    for (int i = 0; i < bodyCount; i++)
    {
        integrateVerletPosition(i, dt);
    }

    clearAllForces();
    int err = applyBarnesHutGravitationalForces(G, DEFAULT_THETA, DEFAULT_EPSILON);

    if (err != QUAD_TREE_OK)
    {
        return err;
    }

    for (int i = 0; i < bodyCount; i++)
    {
        integrateVerletVelocity(i, dt);
    }

    return ENGINE_OK;
}

int initializeVerlet()
{   
    clearAllForces();
    int err = applyBarnesHutGravitationalForces(G, DEFAULT_THETA, DEFAULT_EPSILON);

    if (err != QUAD_TREE_OK)
    {
        return err;
    }

    for (int i = 0; i < getBodyCount(); i++)
    {
        initializeAcceleration(i);
    }

    return ENGINE_OK;
}

void clearAllForces()
{
    for (int i = 0; i < getBodyCount(); i++)
    {
        clearForces(i);
    }
}