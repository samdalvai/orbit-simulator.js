#include <stdio.h>
#include "engine.h"
#include "body.h"

int main(void)
{
    printf("Testing engine\n");
    printf("Body count: %d\n", getBodyCount());

    addNewBody(0, 0, 10, 10, 1, 1, 1, -1);
    printf("Body count: %d\n", getBodyCount());
    return 0;
}
