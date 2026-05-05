#include <stdint.h>

#include "constants.h"
#include "body.h"
#include "quad_tree.h"

#ifdef ENGINE_USE_PTHREADS
#include <pthread.h>

#ifndef ENGINE_FORCE_THREADS
#define ENGINE_FORCE_THREADS 4
#endif

typedef struct
{
    uint32_t start;
    uint32_t end;
    double G;
    double thetaSquared;
} ForceWorkerArgs;

static void applyForcesInRange(ForceWorkerArgs *args)
{
    for (uint32_t i = args->start; i < args->end; i++)
    {
        if (masses[i] == 0.0)
        {
            continue;
        }

        applyForceOn(i, posX[i], posY[i], args->G, args->thetaSquared);
    }
}

static void *applyForcesWorker(void *arg)
{
    applyForcesInRange((ForceWorkerArgs *)arg);
    return 0;
}

static void applyForcesParallel(uint32_t bodyCount, double G, double thetaSquared)
{
    if (bodyCount < ENGINE_FORCE_THREADS)
    {
        ForceWorkerArgs args = {0, bodyCount, G, thetaSquared};
        applyForcesInRange(&args);
        return;
    }

    pthread_t threads[ENGINE_FORCE_THREADS - 1];
    int threadCreated[ENGINE_FORCE_THREADS - 1] = {0};
    ForceWorkerArgs args[ENGINE_FORCE_THREADS];
    uint32_t chunkSize = (bodyCount + ENGINE_FORCE_THREADS - 1) / ENGINE_FORCE_THREADS;

    for (uint32_t thread = 0; thread < ENGINE_FORCE_THREADS; thread++)
    {
        uint32_t start = thread * chunkSize;
        uint32_t end = start + chunkSize;

        if (end > bodyCount)
        {
            end = bodyCount;
        }

        args[thread].start = start;
        args[thread].end = end;
        args[thread].G = G;
        args[thread].thetaSquared = thetaSquared;

        if (thread > 0 && pthread_create(&threads[thread - 1], 0, applyForcesWorker, &args[thread]) == 0)
        {
            threadCreated[thread - 1] = 1;
        }
    }

    applyForcesInRange(&args[0]);

    for (uint32_t thread = 1; thread < ENGINE_FORCE_THREADS; thread++)
    {
        if (threadCreated[thread - 1])
        {
            pthread_join(threads[thread - 1], 0);
        }
        else
        {
            applyForcesInRange(&args[thread]);
        }
    }
}
#else
static void applyForcesSerial(uint32_t bodyCount, double G, double thetaSquared)
{
    for (uint32_t i = 0; i < bodyCount; i++)
    {
        if (masses[i] == 0.0)
        {
            continue;
        }

        applyForceOn(i, posX[i], posY[i], G, thetaSquared);
    }
}
#endif

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

#ifdef ENGINE_USE_PTHREADS
    applyForcesParallel(bodyCount, G, thetaSquared);
#else
    applyForcesSerial(bodyCount, G, thetaSquared);
#endif

    return QUAD_TREE_OK;
}
