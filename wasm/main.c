#include <stdio.h>
#include "engine.h"
#include "constants.h"
#include "body.h"
#include <time.h>

int main(void)
{
    printf("Testing engine\n");
    printf("Body count: %d\n", getBodyCount());

    addNewBody(0, 0, 10, 10, 1, 1, 1, -1);
    printf("Body count: %d\n", getBodyCount());
    removeBody(0);
    printf("Body count: %d\n", getBodyCount());
    printf("DT: %f\n", simulation_dt());
    addNewBody(0, 0, 10, 10, 1, 1, 1, -1);
    addNewBody(100, 0, 10, 10, 1, 1, 1, -1);
    addNewBody(0, 100, 10, 10, 1, 1, 1, -1);
    addNewBody(100, 100, 10, 10, 1, 1, 1, -1);
    printf("Body count: %d\n", getBodyCount());

    // Benchmarking
    clock_t start = clock();

    clock_t end = clock();

    update(simulation_dt());

    double elapsed = (double)(end - start) / CLOCKS_PER_SEC;

    printf("Time: %f seconds\n", elapsed);

    return 0;
}
