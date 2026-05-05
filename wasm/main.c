#include <stdio.h>
#include "engine.h"
#include "constants.h"
#include "body.h"
#include <stdlib.h> // rand
#include <time.h>   // time

double random_double(double min, double max)
{
    return min + (max - min) * ((double)rand() / RAND_MAX);
}

int main(void)
{
    printf("Testing engine\n");

    srand((unsigned int)time(NULL));

    for (int i = 0; i < 10000; i++)
    {
        double x = random_double(-1000.0, 1000.0);
        double y = random_double(-1000.0, 1000.0);
        double vx = random_double(-100.0, 100.0);
        double vy = random_double(-100.0, 100.0);

        addNewBody(x, y, vx, vy, 1, 1, 1, -1);
    }

    printf("Body count: %d\n", getBodyCount());
    printf("initial posX[0]: %f\n", posX[0]);
    printf("initial posX[1]: %f\n", posX[1]);

    // Benchmarking
    clock_t start = clock();

    for (int i = 0; i < 1000; i++)
    {
        int err = update(simulation_dt());

        if (err != ENGINE_OK) {
            return 1;
        }
    }
    clock_t end = clock();

    double elapsed = (double)(end - start) / CLOCKS_PER_SEC;

    printf("Time: %f seconds\n", elapsed);
    printf("final posX[0]: %f\n", posX[0]);
    printf("final posX[1]: %f\n", posX[1]);

    return 0;
}
