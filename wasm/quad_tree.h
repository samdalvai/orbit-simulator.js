#ifndef QUAD_TREE_H
#define QUAD_TREE_H

#include <stdint.h>
#include <stdbool.h>
#include "constants.h"

#define ROOT 0
#define PARENT_CAPACITY MAX_BODIES
#define NODE_CAPACITY (MAX_BODIES * 4)

#define QUAD_TREE_OK 0
#define QUAD_TREE_ERR_PARENT_CAPACITY 1
#define QUAD_TREE_ERR_NODE_CAPACITY 2

extern uint32_t children[NODE_CAPACITY];
extern uint32_t next[NODE_CAPACITY];

extern double nodePosX[NODE_CAPACITY];
extern double nodePosY[NODE_CAPACITY];
extern double mass[NODE_CAPACITY];

extern double centerX[NODE_CAPACITY];
extern double centerY[NODE_CAPACITY];
extern double size[NODE_CAPACITY];

extern uint32_t parents[PARENT_CAPACITY];

extern uint32_t nodeCount;
extern uint32_t parentCount;

extern double thetaSquared;
extern double epsilonSquared;

uint32_t getNodeCount(void);
uint32_t getParentCount(void);
double getThetaSquared(void);

int buildPackedQuadTree(double theta, double epsilon);
void clearQuadTree(double rootCenterX, double rootCenterY, double rootSize);
int insertXYMass(double x, double y, double bodyMass);
void propagate(void);
void applyForceOn(uint32_t bodyId, double x, double y, double G, double thetaSq);

#endif