#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include <float.h>

#include "constants.h"
#include "body.h"
#include "quad_tree.h"

uint32_t children[NODE_CAPACITY];
uint32_t next[NODE_CAPACITY];

double nodePosX[NODE_CAPACITY];
double nodePosY[NODE_CAPACITY];
double mass[NODE_CAPACITY];

double centerX[NODE_CAPACITY];
double centerY[NODE_CAPACITY];
double size[NODE_CAPACITY];

uint32_t parents[PARENT_CAPACITY];

uint32_t nodeCount = 0;
uint32_t parentCount = 0;

double thetaSquared = 0.5 * 0.5;
double epsilonSquared = 1.0;

int subdivideNode(uint32_t node, uint32_t *outFirstChild);

uint32_t pushNode(
    uint32_t nextNode,
    double nodeCenterX,
    double nodeCenterY,
    double nodeSize);

uint32_t getNodeCount(void)
{
    return nodeCount;
}

uint32_t getParentCount(void)
{
    return parentCount;
}

double getThetaSquared(void)
{
    return thetaSquared;
}

int buildPackedQuadTree(double theta, double epsilon)
{
    thetaSquared = theta * theta;
    epsilonSquared = epsilon * epsilon;

    double minX = DBL_MAX;
    double minY = DBL_MAX;
    double maxX = -DBL_MAX;
    double maxY = -DBL_MAX;

    uint32_t bodyCount = getBodyCount();

    for (uint32_t i = 0; i < bodyCount; i++)
    {
        if (masses[i] == 0.0)
        {
            continue;
        }

        double x = posX[i];
        double y = posY[i];

        if (x < minX)
        {
            minX = x;
        }
        if (y < minY)
        {
            minY = y;
        }
        if (x > maxX)
        {
            maxX = x;
        }
        if (y > maxY)
        {
            maxY = y;
        }
    }

    if (minX == DBL_MAX)
    {
        nodeCount = 0;
        parentCount = 0;
        return QUAD_TREE_OK;
    }

    double rootCenterX = (minX + maxX) * 0.5;
    double rootCenterY = (minY + maxY) * 0.5;
    double rootSize = fmax(maxX - minX, maxY - minY);

    clearQuadTree(rootCenterX, rootCenterY, rootSize);

    for (uint32_t i = 0; i < bodyCount; i++)
    {
        int err = insertXYMass(posX[i], posY[i], masses[i]);

        if (err != QUAD_TREE_OK)
        {
            return err;
        }
    }

    propagate();

    return QUAD_TREE_OK;
}

void clearQuadTree(double rootCenterX, double rootCenterY, double rootSize)
{
    nodeCount = 0;
    parentCount = 0;

    pushNode(0, rootCenterX, rootCenterY, rootSize);
}

int insertXYMass(double x, double y, double bodyMass)
{
    if (bodyMass == 0.0)
    {
        return QUAD_TREE_OK;
    }

    uint32_t node = ROOT;

    while (children[node] != 0)
    {
        uint32_t quadrant =
            ((y > centerY[node] ? 1u : 0u) << 1u) |
            (x > centerX[node] ? 1u : 0u);

        node = children[node] + quadrant;
    }

    if (mass[node] == 0.0)
    {
        nodePosX[node] = x;
        nodePosY[node] = y;
        mass[node] = bodyMass;
        return QUAD_TREE_OK;
    }

    double existingX = nodePosX[node];
    double existingY = nodePosY[node];
    double existingMass = mass[node];

    if (x == existingX && y == existingY)
    {
        mass[node] += bodyMass;
        return QUAD_TREE_OK;
    }

    for (;;)
    {
        uint32_t firstChild = 0;
        int err = subdivideNode(node, &firstChild);

        if (err != QUAD_TREE_OK)
        {
            return err;
        }

        uint32_t q1 =
            ((existingY > centerY[node] ? 1u : 0u) << 1u) |
            (existingX > centerX[node] ? 1u : 0u);

        uint32_t q2 =
            ((y > centerY[node] ? 1u : 0u) << 1u) |
            (x > centerX[node] ? 1u : 0u);

        if (q1 == q2)
        {
            node = firstChild + q1;
            continue;
        }

        uint32_t n1 = firstChild + q1;
        nodePosX[n1] = existingX;
        nodePosY[n1] = existingY;
        mass[n1] = existingMass;

        uint32_t n2 = firstChild + q2;
        nodePosX[n2] = x;
        nodePosY[n2] = y;
        mass[n2] = bodyMass;

        return QUAD_TREE_OK;
    }
}

void propagate(void)
{
    for (int32_t p = (int32_t)parentCount - 1; p >= 0; p--)
    {
        uint32_t node = parents[p];
        uint32_t firstChild = children[node];

        uint32_t i0 = firstChild;
        uint32_t i1 = firstChild + 1;
        uint32_t i2 = firstChild + 2;
        uint32_t i3 = firstChild + 3;

        double m0 = mass[i0];
        double m1 = mass[i1];
        double m2 = mass[i2];
        double m3 = mass[i3];

        double totalMass = m0 + m1 + m2 + m3;

        mass[node] = totalMass;

        if (totalMass != 0.0)
        {
            nodePosX[node] =
                (nodePosX[i0] * m0 +
                 nodePosX[i1] * m1 +
                 nodePosX[i2] * m2 +
                 nodePosX[i3] * m3) /
                totalMass;

            nodePosY[node] =
                (nodePosY[i0] * m0 +
                 nodePosY[i1] * m1 +
                 nodePosY[i2] * m2 +
                 nodePosY[i3] * m3) /
                totalMass;
        }
    }
}

void applyForceOn(uint32_t bodyId, double x, double y, double G, double thetaSq)
{
    double accX = 0.0;
    double accY = 0.0;

    if (nodeCount == 0)
    {
        return;
    }

    uint32_t node = ROOT;

    for (;;)
    {
        double dx = nodePosX[node] - x;
        double dy = nodePosY[node] - y;
        double distanceSquared = dx * dx + dy * dy;

        if (
            children[node] == 0 ||
            size[node] * size[node] < distanceSquared * thetaSq)
        {
            double denominator =
                (distanceSquared + epsilonSquared) * sqrt(distanceSquared);

            if (denominator != 0.0)
            {
                double scale = (G * mass[node]) / denominator;

                if (scale > DBL_MAX)
                {
                    scale = DBL_MAX;
                }

                accX += dx * scale;
                accY += dy * scale;
            }

            if (next[node] == 0)
            {
                break;
            }

            node = next[node];
        }
        else
        {
            node = children[node];
        }
    }

    double bodyMass = masses[bodyId];

    sumForcesX[bodyId] += accX * bodyMass;
    sumForcesY[bodyId] += accY * bodyMass;
}

int subdivideNode(uint32_t node, uint32_t *outFirstChild)
{
    if (parentCount >= PARENT_CAPACITY)
    {
        return QUAD_TREE_ERR_PARENT_CAPACITY;
    }

    if (nodeCount + 4 > NODE_CAPACITY)
    {
        return QUAD_TREE_ERR_NODE_CAPACITY;
    }

    parents[parentCount] = node;
    parentCount++;

    uint32_t firstChild = nodeCount;
    children[node] = firstChild;

    double childSize = size[node] * 0.5;
    double offset = childSize * 0.5;

    double nodeCenterX = centerX[node];
    double nodeCenterY = centerY[node];

    pushNode(firstChild + 1, nodeCenterX - offset, nodeCenterY - offset, childSize);
    pushNode(firstChild + 2, nodeCenterX + offset, nodeCenterY - offset, childSize);
    pushNode(firstChild + 3, nodeCenterX - offset, nodeCenterY + offset, childSize);
    pushNode(next[node], nodeCenterX + offset, nodeCenterY + offset, childSize);

    *outFirstChild = firstChild;

    return QUAD_TREE_OK;
}

uint32_t pushNode(
    uint32_t nextNode,
    double nodeCenterX,
    double nodeCenterY,
    double nodeSize)
{
    uint32_t node = nodeCount;
    nodeCount++;

    children[node] = 0;
    next[node] = nextNode;

    nodePosX[node] = 0.0;
    nodePosY[node] = 0.0;
    mass[node] = 0.0;

    centerX[node] = nodeCenterX;
    centerY[node] = nodeCenterY;
    size[node] = nodeSize;

    return node;
}