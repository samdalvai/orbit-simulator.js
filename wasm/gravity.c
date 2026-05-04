#include <stdint.h>

#include "constants.h"
#include "body.h"
#include "quad_tree.h"

int applyBarnesHutGravitationalForces(
    double G,
    double theta,
    double epsilon)
{
    int err = buildPackedQuadTree(theta, epsilon);

    if (err != QUAD_TREE_OK)
    {
        return err;
    }

    uint32_t bodyCount = getBodyCount();
    double thetaSquared = theta * theta;

    for (uint32_t i = 0; i < bodyCount; i++)
    {
        if (masses[i] == 0.0)
        {
            continue;
        }

        applyForceOn(i, posX[i], posY[i], G, thetaSquared);
    }

    return QUAD_TREE_OK;
}