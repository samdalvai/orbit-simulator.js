/*
 * Portions of this file are derived from Box2D and Phaser Box2D.
 *
 * Copyright (c) 2023 Erin Catto
 * Copyright (c) 2024 Phaser Studio Inc
 * Licensed under the MIT License
 */
import { MAX_BODIES, SETTINGS } from '../core/Constants';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { ContactManifoldPool } from '../pools/ContactManifoldPool';
import { CapsuleShape } from '../shapes/CapsuleShape';
import { CircleShape } from '../shapes/CircleShape';
import { PolygonShape } from '../shapes/PolygonShape';
import { ShapeType } from '../shapes/Shape';
import * as Utils from '../utils/Utils';
import { ContactManifold } from './ContactManifold';

export const manifoldPool = new ContactManifoldPool(MAX_BODIES);

export function detectCollision(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const aType = bodyA.shapeType;
    const bType = bodyB.shapeType;

    if (aType === ShapeType.CIRCLE && bType === ShapeType.CIRCLE) {
        return collideCircles(bodyA, bodyB);
    }

    if (aType === ShapeType.CAPSULE && bType === ShapeType.CAPSULE) {
        return collideCapsules(bodyA, bodyB);
    }

    if (aType === ShapeType.CAPSULE && bType === ShapeType.CIRCLE) {
        return collideCapsuleCircle(bodyA, bodyB);
    }

    if (aType === ShapeType.CIRCLE && bType === ShapeType.CAPSULE) {
        return collideCapsuleCircle(bodyB, bodyA);
    }

    if (aType === ShapeType.SEGMENT && bType === ShapeType.CIRCLE) {
        return collideSegmentCircle(bodyA, bodyB);
    }

    if (aType === ShapeType.CIRCLE && bType === ShapeType.SEGMENT) {
        return collideSegmentCircle(bodyB, bodyA);
    }

    const aIsPolygon = isPolygonShape(aType);
    const bIsPolygon = isPolygonShape(bType);

    if (aIsPolygon && bType === ShapeType.CIRCLE) {
        return collidePolygonCircle(bodyA, bodyB);
    }

    if (aType === ShapeType.CIRCLE && bIsPolygon) {
        return collidePolygonCircle(bodyB, bodyA);
    }

    const aIsPolygonLike = isPolygonLikeShape(aType);
    const bIsPolygonLike = isPolygonLikeShape(bType);

    if (aIsPolygonLike && bIsPolygonLike) {
        return collidePolygonLikeBodies(bodyA, bodyB);
    }

    if (aIsPolygonLike && bType === ShapeType.CAPSULE) {
        return collidePolygonLikeAndCapsule(bodyA, bodyB);
    }

    if (aType === ShapeType.CAPSULE && bIsPolygonLike) {
        return collidePolygonLikeAndCapsule(bodyB, bodyA);
    }

    return null;
}

function isPolygonShape(shapeType: ShapeType): boolean {
    return shapeType === ShapeType.BOX || shapeType === ShapeType.POLYGON;
}

function isPolygonLikeShape(shapeType: ShapeType): boolean {
    return isPolygonShape(shapeType) || shapeType === ShapeType.SEGMENT;
}

function createCollisionManifold(
    bodyA: RigidBody,
    bodyB: RigidBody,
    normalX: number,
    normalY: number,
    contactCount: number,
    contactPoint0X: number,
    contactPoint0Y: number,
    contactPoint0Separation: number,
    contactPoint0Id: number,
    contactPoint1X = 0.0,
    contactPoint1Y = 0.0,
    contactPoint1Separation = 0.0,
    contactPoint1Id = 0,
): ContactManifold | null {
    if (contactCount === 0) {
        return null;
    }

    let depth = Math.max(0.0, -contactPoint0Separation);
    if (contactCount === 2) {
        depth = Math.max(depth, -contactPoint1Separation);
    }

    if (manifoldPool != null) {
        return manifoldPool.acquire(
            bodyA,
            bodyB,
            contactCount,
            depth,
            normalX,
            normalY,
            contactPoint0X,
            contactPoint0Y,
            contactPoint0Id,
            contactPoint1X,
            contactPoint1Y,
            contactPoint1Id,
            false,
        );
    }

    return new ContactManifold(
        bodyA,
        bodyB,
        contactCount,
        depth,
        normalX,
        normalY,
        contactPoint0X,
        contactPoint0Y,
        contactPoint0Id,
        contactPoint1X,
        contactPoint1Y,
        contactPoint1Id,
        false,
    );
}

function createSingleContactManifold(
    bodyA: RigidBody,
    bodyB: RigidBody,
    normalX: number,
    normalY: number,
    contactPointX: number,
    contactPointY: number,
    separation: number,
    id: number,
): ContactManifold | null {
    return createCollisionManifold(bodyA, bodyB, normalX, normalY, 1, contactPointX, contactPointY, separation, id);
}

function createDoubleContactManifold(
    bodyA: RigidBody,
    bodyB: RigidBody,
    normalX: number,
    normalY: number,
    contactPoint0X: number,
    contactPoint0Y: number,
    contactPoint0Separation: number,
    contactPoint0Id: number,
    contactPoint1X: number,
    contactPoint1Y: number,
    contactPoint1Separation: number,
    contactPoint1Id: number,
): ContactManifold | null {
    return createCollisionManifold(
        bodyA,
        bodyB,
        normalX,
        normalY,
        2,
        contactPoint0X,
        contactPoint0Y,
        contactPoint0Separation,
        contactPoint0Id,
        contactPoint1X,
        contactPoint1Y,
        contactPoint1Separation,
        contactPoint1Id,
    );
}

export function collideCircles(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const circleA = bodyA.shape as CircleShape;
    const circleB = bodyB.shape as CircleShape;
    const radiusA = circleA.radius;
    const radiusB = circleB.radius;
    const posA = bodyA.position;
    const posB = bodyB.position;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const radiusSum = radiusA + radiusB;
    const contactDistance = radiusSum + SETTINGS.contactSlop;
    const distSq = dx * dx + dy * dy;

    if (distSq > contactDistance * contactDistance) {
        return null;
    }

    let normalX = 1;
    let normalY = 0;
    let distance = 0;

    if (distSq > 0) {
        distance = Math.sqrt(distSq);
        const invDistance = 1 / distance;

        normalX = dx * invDistance;
        normalY = dy * invDistance;
    }

    const pointAX = posA.x + normalX * radiusA;
    const pointAY = posA.y + normalY * radiusA;
    const pointBX = posB.x - normalX * radiusB;
    const pointBY = posB.y - normalY * radiusB;

    return createSingleContactManifold(
        bodyA,
        bodyB,
        normalX,
        normalY,
        (pointAX + pointBX) * 0.5,
        (pointAY + pointBY) * 0.5,
        distance - radiusSum,
        0,
    );
}

export function collidePolygonCircle(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const polygonA = bodyA.shape as PolygonShape;
    const circleB = bodyB.shape as CircleShape;
    const vertices = polygonA.worldVertices;
    const normals = polygonA.worldNormals;
    const circleBX = bodyB.position.x;
    const circleBY = bodyB.position.y;
    const radius = polygonA.radius + circleB.radius;
    const contactDistance = radius + SETTINGS.contactSlop;

    let normalIndex = 0;
    let separation = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < vertices.length; ++i) {
        const vertex = vertices[i];
        const normal = normals[i];
        const candidate = (circleBX - vertex.x) * normal.x + (circleBY - vertex.y) * normal.y;

        if (candidate > separation) {
            separation = candidate;
            normalIndex = i;
        }
    }

    if (separation > contactDistance) {
        return null;
    }

    const vertex1 = vertices[normalIndex];
    const vertex2 = vertices[(normalIndex + 1) % vertices.length];
    const u1 = (circleBX - vertex1.x) * (vertex2.x - vertex1.x) + (circleBY - vertex1.y) * (vertex2.y - vertex1.y);
    const u2 = (circleBX - vertex2.x) * (vertex1.x - vertex2.x) + (circleBY - vertex2.y) * (vertex1.y - vertex2.y);

    if (u1 < 0.0 && separation > 0) {
        const deltaX = circleBX - vertex1.x;
        const deltaY = circleBY - vertex1.y;
        const deltaLengthSquared = deltaX * deltaX + deltaY * deltaY;

        let vertexSeparation = 0;
        let normalX = 1;
        let normalY = 0;

        if (deltaLengthSquared > 0.0) {
            vertexSeparation = Math.sqrt(deltaLengthSquared);

            const invDistance = 1 / vertexSeparation;

            normalX = deltaX * invDistance;
            normalY = deltaY * invDistance;
        }

        if (vertexSeparation > contactDistance) {
            return null;
        }

        const pointAX = vertex1.x + normalX * polygonA.radius;
        const pointAY = vertex1.y + normalY * polygonA.radius;
        const pointBX = circleBX - normalX * circleB.radius;
        const pointBY = circleBY - normalY * circleB.radius;

        return createSingleContactManifold(
            bodyA,
            bodyB,
            normalX,
            normalY,
            (pointAX + pointBX) * 0.5,
            (pointAY + pointBY) * 0.5,
            vertexSeparation - radius,
            0,
        );
    }

    if (u2 < 0.0 && separation > 0) {
        const deltaX = circleBX - vertex2.x;
        const deltaY = circleBY - vertex2.y;
        const deltaLengthSquared = deltaX * deltaX + deltaY * deltaY;

        let vertexSeparation = 0;
        let normalX = 1;
        let normalY = 0;

        if (deltaLengthSquared > 0.0) {
            vertexSeparation = Math.sqrt(deltaLengthSquared);

            const invDistance = 1 / vertexSeparation;

            normalX = deltaX * invDistance;
            normalY = deltaY * invDistance;
        }

        if (vertexSeparation > contactDistance) {
            return null;
        }

        const pointAX = vertex2.x + normalX * polygonA.radius;
        const pointAY = vertex2.y + normalY * polygonA.radius;
        const pointBX = circleBX - normalX * circleB.radius;
        const pointBY = circleBY - normalY * circleB.radius;

        return createSingleContactManifold(
            bodyA,
            bodyB,
            normalX,
            normalY,
            (pointAX + pointBX) * 0.5,
            (pointAY + pointBY) * 0.5,
            vertexSeparation - radius,
            0,
        );
    }

    const normalX = normals[normalIndex].x;
    const normalY = normals[normalIndex].y;
    const planeOffset = (circleBX - vertex1.x) * normalX + (circleBY - vertex1.y) * normalY;
    const pointAX = circleBX + normalX * (polygonA.radius - planeOffset);
    const pointAY = circleBY + normalY * (polygonA.radius - planeOffset);
    const pointBX = circleBX - normalX * circleB.radius;
    const pointBY = circleBY - normalY * circleB.radius;

    return createSingleContactManifold(
        bodyA,
        bodyB,
        normalX,
        normalY,
        (pointAX + pointBX) * 0.5,
        (pointAY + pointBY) * 0.5,
        separation - radius,
        0,
    );
}

function clipConvexEdges(
    bodyA: RigidBody,
    bodyB: RigidBody,
    verticesA: readonly Vec2[],
    normalsA: readonly Vec2[],
    radiusA: number,
    verticesB: readonly Vec2[],
    normalsB: readonly Vec2[],
    radiusB: number,
    edgeA: number,
    edgeB: number,
    flip: boolean,
): ContactManifold | null {
    const referenceVertices = flip ? verticesB : verticesA;
    const referenceNormals = flip ? normalsB : normalsA;
    const referenceRadius = flip ? radiusB : radiusA;
    const incidentVertices = flip ? verticesA : verticesB;
    const incidentRadius = flip ? radiusA : radiusB;
    const i11 = flip ? edgeB : edgeA;
    const i12 = (i11 + 1) % referenceVertices.length;
    const i21 = flip ? edgeA : edgeB;
    const i22 = (i21 + 1) % incidentVertices.length;

    const v11 = referenceVertices[i11];
    const v12 = referenceVertices[i12];
    const v21 = incidentVertices[i21];
    const v22 = incidentVertices[i22];
    const normalX = referenceNormals[i11].x;
    const normalY = referenceNormals[i11].y;
    const tangentX = -normalY;
    const tangentY = normalX;
    const upper1 = (v12.x - v11.x) * tangentX + (v12.y - v11.y) * tangentY;
    const upper2 = (v21.x - v11.x) * tangentX + (v21.y - v11.y) * tangentY;
    const lower2 = (v22.x - v11.x) * tangentX + (v22.y - v11.y) * tangentY;
    const clipDenominator = upper2 - lower2;

    let vLowerX = v22.x;
    let vLowerY = v22.y;

    if (lower2 < 0.0 && clipDenominator > 0.0) {
        const t = (0.0 - lower2) / clipDenominator;

        vLowerX = v22.x + (v21.x - v22.x) * t;
        vLowerY = v22.y + (v21.y - v22.y) * t;
    }

    let vUpperX = v21.x;
    let vUpperY = v21.y;

    if (upper2 > upper1 && clipDenominator > 0.0) {
        const t = (upper1 - lower2) / clipDenominator;

        vUpperX = v22.x + (v21.x - v22.x) * t;
        vUpperY = v22.y + (v21.y - v22.y) * t;
    }

    const separationLower = (vLowerX - v11.x) * normalX + (vLowerY - v11.y) * normalY;
    const separationUpper = (vUpperX - v11.x) * normalX + (vUpperY - v11.y) * normalY;
    const radius = radiusA + radiusB;
    const pointLowerOffset = 0.5 * (referenceRadius - incidentRadius - separationLower);
    const pointUpperOffset = 0.5 * (referenceRadius - incidentRadius - separationUpper);
    let contactPoint0X = vLowerX + normalX * pointLowerOffset;
    let contactPoint0Y = vLowerY + normalY * pointLowerOffset;
    let contactPoint0Separation = separationLower - radius;
    let contactPoint0Id = Utils.makeId(i11, i22);
    let contactPoint1X = vUpperX + normalX * pointUpperOffset;
    let contactPoint1Y = vUpperY + normalY * pointUpperOffset;
    let contactPoint1Separation = separationUpper - radius;
    let contactPoint1Id = Utils.makeId(i12, i21);

    if (flip) {
        const tmpPointX = contactPoint0X;
        const tmpPointY = contactPoint0Y;
        const tmpSeparation = contactPoint0Separation;
        const tmpId = contactPoint0Id;

        contactPoint0X = contactPoint1X;
        contactPoint0Y = contactPoint1Y;
        contactPoint0Separation = contactPoint1Separation;
        contactPoint0Id = contactPoint1Id;

        contactPoint1X = tmpPointX;
        contactPoint1Y = tmpPointY;
        contactPoint1Separation = tmpSeparation;
        contactPoint1Id = tmpId;
    }

    const hasContact0 = contactPoint0Separation <= SETTINGS.contactSlop;
    const hasContact1 = contactPoint1Separation <= SETTINGS.contactSlop;
    const manifoldNormalX = flip ? -normalX : normalX;
    const manifoldNormalY = flip ? -normalY : normalY;

    if (!hasContact0 && !hasContact1) {
        return null;
    }

    if (hasContact0 && hasContact1) {
        const dx = contactPoint0X - contactPoint1X;
        const dy = contactPoint0Y - contactPoint1Y;

        if (dx * dx + dy * dy <= SETTINGS.contactMergeThreshold) {
            return createSingleContactManifold(
                bodyA,
                bodyB,
                manifoldNormalX,
                manifoldNormalY,
                contactPoint0X,
                contactPoint0Y,
                contactPoint0Separation,
                contactPoint0Id,
            );
        }

        return createDoubleContactManifold(
            bodyA,
            bodyB,
            manifoldNormalX,
            manifoldNormalY,
            contactPoint0X,
            contactPoint0Y,
            contactPoint0Separation,
            contactPoint0Id,
            contactPoint1X,
            contactPoint1Y,
            contactPoint1Separation,
            contactPoint1Id,
        );
    }

    if (hasContact0) {
        return createSingleContactManifold(
            bodyA,
            bodyB,
            manifoldNormalX,
            manifoldNormalY,
            contactPoint0X,
            contactPoint0Y,
            contactPoint0Separation,
            contactPoint0Id,
        );
    }

    return createSingleContactManifold(
        bodyA,
        bodyB,
        manifoldNormalX,
        manifoldNormalY,
        contactPoint1X,
        contactPoint1Y,
        contactPoint1Separation,
        contactPoint1Id,
    );
}

function findMaxSeparation(
    verticesA: readonly Vec2[],
    normalsA: readonly Vec2[],
    verticesB: readonly Vec2[],
): { edgeIndex: number; maxSeparation: number } {
    let bestIndex = 0;
    let maxSeparation = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < verticesA.length; ++i) {
        const normal = normalsA[i];
        const vertex = verticesA[i];
        let separation = Number.POSITIVE_INFINITY;

        for (let j = 0; j < verticesB.length; ++j) {
            const candidate = (verticesB[j].x - vertex.x) * normal.x + (verticesB[j].y - vertex.y) * normal.y;
            if (candidate < separation) {
                separation = candidate;
            }
        }

        if (separation > maxSeparation) {
            maxSeparation = separation;
            bestIndex = i;
        }
    }

    return { edgeIndex: bestIndex, maxSeparation };
}

function segmentDistance(
    p1X: number,
    p1Y: number,
    q1X: number,
    q1Y: number,
    p2X: number,
    p2Y: number,
    q2X: number,
    q2Y: number,
): {
    fraction1: number;
    fraction2: number;
    distanceSquared: number;
} {
    let fraction1 = 0;
    let fraction2 = 0;

    const d1X = q1X - p1X;
    const d1Y = q1Y - p1Y;
    const d2X = q2X - p2X;
    const d2Y = q2Y - p2Y;
    const rX = p1X - p2X;
    const rY = p1Y - p2Y;
    const dd1 = d1X * d1X + d1Y * d1Y;
    const dd2 = d2X * d2X + d2Y * d2Y;
    const rd2 = rX * d2X + rY * d2Y;
    const rd1 = rX * d1X + rY * d1Y;

    if (dd1 < 0 || dd2 < 0) {
        if (dd1 >= 0) {
            fraction1 = Utils.clamp(-rd1 / dd1, 0.0, 1.0);
            fraction2 = 0.0;
        } else if (dd2 >= 0) {
            fraction1 = 0.0;
            fraction2 = Utils.clamp(rd2 / dd2, 0.0, 1.0);
        }
    } else {
        const d12 = d1X * d2X + d1Y * d2Y;
        const denominator = dd1 * dd2 - d12 * d12;

        let f1 = 0.0;
        if (denominator !== 0.0) {
            f1 = Utils.clamp((d12 * rd2 - rd1 * dd2) / denominator, 0.0, 1.0);
        }

        let f2 = (d12 * f1 + rd2) / dd2;

        if (f2 < 0.0) {
            f2 = 0.0;
            f1 = Utils.clamp(-rd1 / dd1, 0.0, 1.0);
        } else if (f2 > 1.0) {
            f2 = 1.0;
            f1 = Utils.clamp((d12 - rd1) / dd1, 0.0, 1.0);
        }

        fraction1 = f1;
        fraction2 = f2;
    }

    const closest1X = p1X + fraction1 * d1X;
    const closest1Y = p1Y + fraction1 * d1Y;
    const closest2X = p2X + fraction2 * d2X;
    const closest2Y = p2Y + fraction2 * d2Y;
    const dx = closest1X - closest2X;
    const dy = closest1Y - closest2Y;

    return {
        fraction1,
        fraction2,
        distanceSquared: dx * dx + dy * dy,
    };
}

function collideConvexPolygons(
    bodyA: RigidBody,
    bodyB: RigidBody,
    verticesA: readonly Vec2[],
    normalsA: readonly Vec2[],
    radiusA: number,
    verticesB: readonly Vec2[],
    normalsB: readonly Vec2[],
    radiusB: number,
): ContactManifold | null {
    const { edgeIndex: initialEdgeA, maxSeparation: separationA } = findMaxSeparation(verticesA, normalsA, verticesB);
    const { edgeIndex: initialEdgeB, maxSeparation: separationB } = findMaxSeparation(verticesB, normalsB, verticesA);
    const radius = radiusA + radiusB;
    const contactDistance = radius + SETTINGS.contactSlop;

    if (separationA > contactDistance || separationB > contactDistance) {
        return null;
    }

    let edgeA = initialEdgeA;
    let edgeB = initialEdgeB;
    let flip = false;

    if (separationA >= separationB) {
        const searchDirectionX = normalsA[edgeA].x;
        const searchDirectionY = normalsA[edgeA].y;
        let minDot = Number.MAX_VALUE;

        for (let i = 0; i < normalsB.length; ++i) {
            const dot = searchDirectionX * normalsB[i].x + searchDirectionY * normalsB[i].y;
            if (dot < minDot) {
                minDot = dot;
                edgeB = i;
            }
        }
    } else {
        flip = true;

        const searchDirectionX = normalsB[edgeB].x;
        const searchDirectionY = normalsB[edgeB].y;
        let minDot = Number.MAX_VALUE;
        edgeA = 0;

        for (let i = 0; i < normalsA.length; ++i) {
            const dot = searchDirectionX * normalsA[i].x + searchDirectionY * normalsA[i].y;
            if (dot < minDot) {
                minDot = dot;
                edgeA = i;
            }
        }
    }

    const createVertexContact = (
        vertexAX: number,
        vertexAY: number,
        vertexBX: number,
        vertexBY: number,
        fallbackNormalX: number,
        fallbackNormalY: number,
        id: number,
    ): ContactManifold | null => {
        const deltaX = vertexBX - vertexAX;
        const deltaY = vertexBY - vertexAY;
        const deltaLengthSquared = deltaX * deltaX + deltaY * deltaY;

        let distance = 0;
        let normalX = fallbackNormalX;
        let normalY = fallbackNormalY;

        if (deltaLengthSquared > 0.0) {
            distance = Math.sqrt(deltaLengthSquared);

            const invDistance = 1 / distance;

            normalX = deltaX * invDistance;
            normalY = deltaY * invDistance;
        }

        if (distance > contactDistance) {
            return null;
        }

        const pointAX = vertexAX + normalX * radiusA;
        const pointAY = vertexAY + normalY * radiusA;
        const pointBX = vertexBX - normalX * radiusB;
        const pointBY = vertexBY - normalY * radiusB;

        return createSingleContactManifold(
            bodyA,
            bodyB,
            normalX,
            normalY,
            (pointAX + pointBX) * 0.5,
            (pointAY + pointBY) * 0.5,
            distance - radius,
            id,
        );
    };

    if (separationA > 0 || separationB > 0) {
        const i11 = edgeA;
        const i12 = (edgeA + 1) % verticesA.length;
        const i21 = edgeB;
        const i22 = (edgeB + 1) % verticesB.length;
        const v11 = verticesA[i11];
        const v12 = verticesA[i12];
        const v21 = verticesB[i21];
        const v22 = verticesB[i22];
        const result = segmentDistance(v11.x, v11.y, v12.x, v12.y, v21.x, v21.y, v22.x, v22.y);

        if (result.fraction1 === 0.0 && result.fraction2 === 0.0) {
            return createVertexContact(
                v11.x,
                v11.y,
                v21.x,
                v21.y,
                normalsA[edgeA].x,
                normalsA[edgeA].y,
                Utils.makeId(i11, i21),
            );
        }

        if (result.fraction1 === 0.0 && result.fraction2 === 1.0) {
            return createVertexContact(
                v11.x,
                v11.y,
                v22.x,
                v22.y,
                normalsA[edgeA].x,
                normalsA[edgeA].y,
                Utils.makeId(i11, i22),
            );
        }

        if (result.fraction1 === 1.0 && result.fraction2 === 0.0) {
            return createVertexContact(
                v12.x,
                v12.y,
                v21.x,
                v21.y,
                normalsA[edgeA].x,
                normalsA[edgeA].y,
                Utils.makeId(i12, i21),
            );
        }

        if (result.fraction1 === 1.0 && result.fraction2 === 1.0) {
            return createVertexContact(
                v12.x,
                v12.y,
                v22.x,
                v22.y,
                normalsA[edgeA].x,
                normalsA[edgeA].y,
                Utils.makeId(i12, i22),
            );
        }
    }

    return clipConvexEdges(
        bodyA,
        bodyB,
        verticesA,
        normalsA,
        radiusA,
        verticesB,
        normalsB,
        radiusB,
        edgeA,
        edgeB,
        flip,
    );
}

function collidePolygonLikeBodies(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const shapeA = bodyA.shape as PolygonShape;
    const shapeB = bodyB.shape as PolygonShape;

    return collideConvexPolygons(
        bodyA,
        bodyB,
        shapeA.worldVertices,
        shapeA.worldNormals,
        shapeA.radius,
        shapeB.worldVertices,
        shapeB.worldNormals,
        shapeB.radius,
    );
}

function collideSegmentRadiusPairs(
    bodyA: RigidBody,
    bodyB: RigidBody,
    p1: Vec2,
    q1: Vec2,
    radiusA: number,
    p2: Vec2,
    q2: Vec2,
    radiusB: number,
): ContactManifold | null {
    const p1X = p1.x;
    const p1Y = p1.y;
    const q1X = q1.x;
    const q1Y = q1.y;
    const p2X = p2.x;
    const p2Y = p2.y;
    const q2X = q2.x;
    const q2Y = q2.y;
    const d1X = q1X - p1X;
    const d1Y = q1Y - p1Y;
    const d2X = q2X - p2X;
    const d2Y = q2Y - p2Y;
    const result = segmentDistance(p1.x, p1.y, q1.x, q1.y, p2.x, p2.y, q2.x, q2.y);
    const f1 = result.fraction1;
    const f2 = result.fraction2;
    const closest1X = p1X + d1X * f1;
    const closest1Y = p1Y + d1Y * f1;
    const closest2X = p2X + d2X * f2;
    const closest2Y = p2Y + d2Y * f2;
    const radius = radiusA + radiusB;
    const contactDistance = radius + SETTINGS.contactSlop;

    if (result.distanceSquared > contactDistance * contactDistance) {
        return null;
    }

    const length1Squared = d1X * d1X + d1Y * d1Y;
    const length1 = Math.sqrt(length1Squared);
    const u1X = length1 > 0 ? d1X / length1 : 0;
    const u1Y = length1 > 0 ? d1Y / length1 : 1;
    const length2Squared = d2X * d2X + d2Y * d2Y;
    const length2 = Math.sqrt(length2Squared);
    const u2X = length2 > 0 ? d2X / length2 : 0;
    const u2Y = length2 > 0 ? d2Y / length2 : 1;
    const fp2 = (p2X - p1X) * u1X + (p2Y - p1Y) * u1Y;
    const fq2 = (q2X - p1X) * u1X + (q2Y - p1Y) * u1Y;
    const outsideA = (fp2 <= 0.0 && fq2 <= 0.0) || (fp2 >= length1 && fq2 >= length1);
    const fp1 = (p1X - p2X) * u2X + (p1Y - p2Y) * u2Y;
    const fq1 = (q1X - p2X) * u2X + (q1Y - p2Y) * u2Y;
    const outsideB = (fp1 <= 0.0 && fq1 <= 0.0) || (fp1 >= length2 && fq1 >= length2);
    const closestDistance = Math.sqrt(result.distanceSquared);

    if (!outsideA && !outsideB) {
        let normalAX = -u1Y;
        let normalAY = u1X;
        const ssA1 = (p2X - p1X) * normalAX + (p2Y - p1Y) * normalAY;
        const ssA2 = (q2X - p1X) * normalAX + (q2Y - p1Y) * normalAY;
        const sAPositive = Math.min(ssA1, ssA2);
        const sANegative = Math.max(-ssA1, -ssA2);
        const separationA = sAPositive > sANegative ? sAPositive : sANegative;
        if (sAPositive <= sANegative) {
            normalAX = -normalAX;
            normalAY = -normalAY;
        }

        let normalBX = -u2Y;
        let normalBY = u2X;
        const ssB1 = (p1X - p2X) * normalBX + (p1Y - p2Y) * normalBY;
        const ssB2 = (q1X - p2X) * normalBX + (q1Y - p2Y) * normalBY;
        const sBPositive = Math.min(ssB1, ssB2);
        const sBNegative = Math.max(-ssB1, -ssB2);
        const separationB = sBPositive > sBNegative ? sBPositive : sBNegative;
        if (sBPositive <= sBNegative) {
            normalBX = -normalBX;
            normalBY = -normalBY;
        }

        if (separationA >= separationB) {
            let cpX = p2X;
            let cpY = p2Y;
            let cqX = q2X;
            let cqY = q2Y;

            if (fp2 < 0.0 && fq2 > 0.0) {
                const t = (0.0 - fp2) / (fq2 - fp2);

                cpX = p2X + (q2X - p2X) * t;
                cpY = p2Y + (q2Y - p2Y) * t;
            } else if (fq2 < 0.0 && fp2 > 0.0) {
                const t = (0.0 - fq2) / (fp2 - fq2);

                cqX = q2X + (p2X - q2X) * t;
                cqY = q2Y + (p2Y - q2Y) * t;
            }

            if (fp2 > length1 && fq2 < length1) {
                const t = (fp2 - length1) / (fp2 - fq2);

                cpX = p2X + (q2X - p2X) * t;
                cpY = p2Y + (q2Y - p2Y) * t;
            } else if (fq2 > length1 && fp2 < length1) {
                const t = (fq2 - length1) / (fq2 - fp2);

                cqX = q2X + (p2X - q2X) * t;
                cqY = q2Y + (p2Y - q2Y) * t;
            }

            const sp = (cpX - p1X) * normalAX + (cpY - p1Y) * normalAY;
            const sq = (cqX - p1X) * normalAX + (cqY - p1Y) * normalAY;

            if (sp <= closestDistance || sq <= closestDistance) {
                return createDoubleContactManifold(
                    bodyA,
                    bodyB,
                    normalAX,
                    normalAY,
                    cpX + normalAX * (0.5 * (radiusA - radiusB - sp)),
                    cpY + normalAY * (0.5 * (radiusA - radiusB - sp)),
                    sp - radius,
                    Utils.makeId(0, 0),
                    cqX + normalAX * (0.5 * (radiusA - radiusB - sq)),
                    cqY + normalAY * (0.5 * (radiusA - radiusB - sq)),
                    sq - radius,
                    Utils.makeId(0, 1),
                );
            }
        } else {
            let cpX = p1X;
            let cpY = p1Y;
            let cqX = q1X;
            let cqY = q1Y;

            if (fp1 < 0.0 && fq1 > 0.0) {
                const t = (0.0 - fp1) / (fq1 - fp1);

                cpX = p1X + (q1X - p1X) * t;
                cpY = p1Y + (q1Y - p1Y) * t;
            } else if (fq1 < 0.0 && fp1 > 0.0) {
                const t = (0.0 - fq1) / (fp1 - fq1);

                cqX = q1X + (p1X - q1X) * t;
                cqY = q1Y + (p1Y - q1Y) * t;
            }

            if (fp1 > length2 && fq1 < length2) {
                const t = (fp1 - length2) / (fp1 - fq1);

                cpX = p1X + (q1X - p1X) * t;
                cpY = p1Y + (q1Y - p1Y) * t;
            } else if (fq1 > length2 && fp1 < length2) {
                const t = (fq1 - length2) / (fq1 - fp1);

                cqX = q1X + (p1X - q1X) * t;
                cqY = q1Y + (p1Y - q1Y) * t;
            }

            const sp = (cpX - p2X) * normalBX + (cpY - p2Y) * normalBY;
            const sq = (cqX - p2X) * normalBX + (cqY - p2Y) * normalBY;

            if (sp <= closestDistance || sq <= closestDistance) {
                return createDoubleContactManifold(
                    bodyA,
                    bodyB,
                    -normalBX,
                    -normalBY,
                    cpX + normalBX * (0.5 * (radiusB - radiusA - sp)),
                    cpY + normalBY * (0.5 * (radiusB - radiusA - sp)),
                    sp - radius,
                    Utils.makeId(0, 0),
                    cqX + normalBX * (0.5 * (radiusB - radiusA - sq)),
                    cqY + normalBY * (0.5 * (radiusB - radiusA - sq)),
                    sq - radius,
                    Utils.makeId(1, 0),
                );
            }
        }
    }

    const fallbackNormalX = -u1Y;
    const fallbackNormalY = u1X;
    const deltaX = closest2X - closest1X;
    const deltaY = closest2Y - closest1Y;
    const deltaLengthSquared = deltaX * deltaX + deltaY * deltaY;

    let separation = 0;
    let normalX = fallbackNormalX;
    let normalY = fallbackNormalY;

    if (deltaLengthSquared > 0.0) {
        separation = Math.sqrt(deltaLengthSquared);

        const invDistance = 1 / separation;

        normalX = deltaX * invDistance;
        normalY = deltaY * invDistance;
    }

    const pointAX = closest1X + normalX * radiusA;
    const pointAY = closest1Y + normalY * radiusA;
    const pointBX = closest2X - normalX * radiusB;
    const pointBY = closest2Y - normalY * radiusB;
    const idA = f1 === 0.0 ? 0 : 1;
    const idB = f2 === 0.0 ? 0 : 1;

    return createSingleContactManifold(
        bodyA,
        bodyB,
        normalX,
        normalY,
        (pointAX + pointBX) * 0.5,
        (pointAY + pointBY) * 0.5,
        separation - radius,
        Utils.makeId(idA, idB),
    );
}

function collideSegmentRadiusAndCircle(
    bodyA: RigidBody,
    bodyB: RigidBody,
    startA: Vec2,
    endA: Vec2,
    radiusA: number,
): ContactManifold | null {
    const circleB = bodyB.shape as CircleShape;
    const startAX = startA.x;
    const startAY = startA.y;
    const endAX = endA.x;
    const endAY = endA.y;
    const circleBX = bodyB.position.x;
    const circleBY = bodyB.position.y;
    const edgeX = endAX - startAX;
    const edgeY = endAY - startAY;
    const startProjection = (circleBX - startAX) * edgeX + (circleBY - startAY) * edgeY;
    const endProjection = (endAX - circleBX) * edgeX + (endAY - circleBY) * edgeY;

    let pointAX = startAX;
    let pointAY = startAY;

    if (startProjection < 0.0) {
        pointAX = startAX;
        pointAY = startAY;
    } else if (endProjection < 0.0) {
        pointAX = endAX;
        pointAY = endAY;
    } else {
        const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;
        const t = edgeLengthSquared > 0.0 ? startProjection / edgeLengthSquared : 0.0;

        pointAX = startAX + edgeX * t;
        pointAY = startAY + edgeY * t;
    }

    let fallbackNormalX = 1;
    let fallbackNormalY = 0;
    const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;

    if (edgeLengthSquared > 0.0) {
        const invEdgeLength = 1 / Math.sqrt(edgeLengthSquared);

        fallbackNormalX = -edgeY * invEdgeLength;
        fallbackNormalY = edgeX * invEdgeLength;
    }

    const deltaX = circleBX - pointAX;
    const deltaY = circleBY - pointAY;
    const deltaLengthSquared = deltaX * deltaX + deltaY * deltaY;

    let distance = 0;
    let normalX = fallbackNormalX;
    let normalY = fallbackNormalY;

    if (deltaLengthSquared > 0.0) {
        distance = Math.sqrt(deltaLengthSquared);

        const invDistance = 1 / distance;

        normalX = deltaX * invDistance;
        normalY = deltaY * invDistance;
    }

    const separation = distance - radiusA - circleB.radius;

    if (separation > SETTINGS.contactSlop) {
        return null;
    }

    const contactAX = pointAX + normalX * radiusA;
    const contactAY = pointAY + normalY * radiusA;
    const contactBX = circleBX - normalX * circleB.radius;
    const contactBY = circleBY - normalY * circleB.radius;

    return createSingleContactManifold(
        bodyA,
        bodyB,
        normalX,
        normalY,
        (contactAX + contactBX) * 0.5,
        (contactAY + contactBY) * 0.5,
        separation,
        0,
    );
}

export function collideCapsuleCircle(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const capsuleA = bodyA.shape as CapsuleShape;

    return collideSegmentRadiusAndCircle(bodyA, bodyB, capsuleA.worldCenter1, capsuleA.worldCenter2, capsuleA.radius);
}

export function collideCapsules(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const capsuleA = bodyA.shape as CapsuleShape;
    const capsuleB = bodyB.shape as CapsuleShape;

    return collideSegmentRadiusPairs(
        bodyA,
        bodyB,
        capsuleA.worldCenter1,
        capsuleA.worldCenter2,
        capsuleA.radius,
        capsuleB.worldCenter1,
        capsuleB.worldCenter2,
        capsuleB.radius,
    );
}

function collideSegmentCircle(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const segmentA = bodyA.shape as PolygonShape;

    return collideSegmentRadiusAndCircle(bodyA, bodyB, segmentA.worldVertices[0], segmentA.worldVertices[1], 0);
}

function collidePolygonLikeAndCapsule(bodyA: RigidBody, bodyB: RigidBody): ContactManifold | null {
    const shapeA = bodyA.shape as PolygonShape;
    const capsuleB = bodyB.shape as CapsuleShape;
    const capsuleVertices = [capsuleB.worldCenter1, capsuleB.worldCenter2];
    const axisX = capsuleB.worldCenter1.x - capsuleB.worldCenter2.x;
    const axisY = capsuleB.worldCenter1.y - capsuleB.worldCenter2.y;
    const axisLengthSquared = axisX * axisX + axisY * axisY;

    let normalX = 1;
    let normalY = 0;

    if (axisLengthSquared > 0.0) {
        const invAxisLength = 1 / Math.sqrt(axisLengthSquared);

        normalX = axisY * invAxisLength;
        normalY = -axisX * invAxisLength;
    }

    const capsuleNormals = [new Vec2(normalX, normalY), new Vec2(-normalX, -normalY)];

    return collideConvexPolygons(
        bodyA,
        bodyB,
        shapeA.worldVertices,
        shapeA.worldNormals,
        shapeA.radius,
        capsuleVertices,
        capsuleNormals,
        capsuleB.radius,
    );
}
