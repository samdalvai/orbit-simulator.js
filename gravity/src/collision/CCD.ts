import { SegmentShape } from '..';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { CapsuleShape } from '../shapes/CapsuleShape';
import { CircleShape } from '../shapes/CircleShape';
import { PolygonShape } from '../shapes/PolygonShape';
import { ShapeType } from '../shapes/Shape';
import * as Utils from '../utils/Utils';

const EPSILON = 1e-8;

export function resolveCCD(bullet: RigidBody, bodies: RigidBody[], dt: number): number | null {
    Utils.assert(bullet.shape instanceof CircleShape);

    const bulletShape = bullet.shape as CircleShape;
    const radius = bulletShape.radius;
    const bulletPosition = bullet.position;
    const bulletVelocity = bullet.velocity;
    const px = bulletPosition.x;
    const py = bulletPosition.y;
    const staticDx = bulletVelocity.x * dt;
    const staticDy = bulletVelocity.y * dt;
    let lowestFraction = 1;

    for (let i = 0; i < bodies.length; i++) {
        const other = bodies[i];

        if (bullet.id === other.id || other.isBullet) continue;

        const dx = other.invMass === 0 ? staticDx : (bulletVelocity.x - other.velocity.x) * dt;
        const dy = other.invMass === 0 ? staticDy : (bulletVelocity.y - other.velocity.y) * dt;
        const nextX = px + dx;
        const nextY = py + dy;

        // Compute swept AABB for bullet
        const minX = Math.min(px, nextX) - radius;
        const minY = Math.min(py, nextY) - radius;
        const maxX = Math.max(px, nextX) + radius;
        const maxY = Math.max(py, nextY) + radius;

        // If objects don't overlap on X axis they cannot collide
        // Here compared to prune & sweep broad phase we need to check also (other.maxX < minX)
        // because cahnged AABB for bullet makes sorting not consistent
        if (other.minX > maxX || other.maxX < minX) continue;

        // If objects overlap on X axis but don't overlap on Y axis the cannot collide
        if (other.maxY < minY || other.minY > maxY) continue;

        let toi: number | null = null;

        switch (other.shapeType) {
            case ShapeType.BOX:
            case ShapeType.POLYGON: {
                toi = sweepCircleVsPolygonTOI(px, py, dx, dy, radius, other);
                break;
            }
            case ShapeType.SEGMENT: {
                toi = sweepCircleVsSegmentTOI(px, py, dx, dy, radius, other);
                break;
            }
            case ShapeType.CIRCLE: {
                toi = sweepCircleVsCircleTOI(px, py, dx, dy, radius, other);
                break;
            }
            case ShapeType.CAPSULE: {
                toi = sweepCircleVsCapsuleTOI(px, py, dx, dy, radius, other);
                break;
            }
        }

        if (toi != null && toi < lowestFraction) {
            lowestFraction = toi;
        }
    }

    return lowestFraction < 1 ? lowestFraction : null;
}

function sweepCircleVsCircleTOI(
    px: number,
    py: number,
    dx: number,
    dy: number,
    radius: number,
    bodyB: RigidBody,
): number | null {
    const circleB = bodyB.shape as CircleShape;
    const bodyBPosition = bodyB.position;

    const r = radius + circleB.radius;
    const mx = px - bodyBPosition.x;
    const my = py - bodyBPosition.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (mx * dx + my * dy);
    const c = mx * mx + my * my - r * r;

    if (c <= 0) {
        return 0;
    }

    if (a <= EPSILON) {
        return null;
    }

    const disc = b * b - 4 * a * c;

    if (disc < -EPSILON) {
        return null;
    }

    const t = (-b - Math.sqrt(Math.max(disc, 0))) / (2 * a);

    if (t < 0 || t > 1) {
        return null;
    }

    return t;
}

function sweepCircleVsSegmentTOI(
    px: number,
    py: number,
    dx: number,
    dy: number,
    radius: number,
    bodyB: RigidBody,
): number | null {
    const segment = bodyB.shape as SegmentShape;
    const a = segment.worldVertices[0];
    const b = segment.worldVertices[1];

    return sweepPointVsSegmentRadiusTOI(px, py, dx, dy, a.x, a.y, b.x, b.y, radius);
}

function sweepPointVsPointRadiusTOI(
    px: number,
    py: number,
    dx: number,
    dy: number,
    centerX: number,
    centerY: number,
    radius: number,
): number | null {
    const mx = px - centerX;
    const my = py - centerY;

    const a = dx * dx + dy * dy;
    const b = 2 * (mx * dx + my * dy);
    const c = mx * mx + my * my - radius * radius;

    if (c <= 0) {
        return 0;
    }

    if (a <= EPSILON) {
        return null;
    }

    const disc = b * b - 4 * a * c;

    if (disc < -EPSILON) {
        return null;
    }

    const t = (-b - Math.sqrt(Math.max(0, disc))) / (2 * a);

    if (t < 0 || t > 1) {
        return null;
    }

    return t;
}

function distancePointToSegmentSquared(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): number {
    const abX = bx - ax;
    const abY = by - ay;
    const apX = px - ax;
    const apY = py - ay;
    const abLenSq = abX * abX + abY * abY;

    if (abLenSq <= EPSILON) {
        return apX * apX + apY * apY;
    }

    let t = (apX * abX + apY * abY) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = ax + abX * t;
    const closestY = ay + abY * t;
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
}

function sweepCircleVsCapsuleTOI(
    px: number,
    py: number,
    dx: number,
    dy: number,
    radius: number,
    bodyB: RigidBody,
): number | null {
    const capsule = bodyB.shape as CapsuleShape;

    const top = capsule.getTopCirclePosition();
    const bottom = capsule.getBottomCirclePosition();

    // Expand capsule by circle radius
    const expandedRadius = radius + capsule.radius;

    return sweepPointVsSegmentRadiusTOI(px, py, dx, dy, top.x, top.y, bottom.x, bottom.y, expandedRadius);
}

function sweepPointVsSegmentRadiusTOI(
    px: number,
    py: number,
    dx: number,
    dy: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number,
): number | null {
    const abX = bx - ax;
    const abY = by - ay;
    const abLenSq = abX * abX + abY * abY;

    // Degenerate capsule -> circle
    if (abLenSq <= EPSILON) {
        return sweepPointVsPointRadiusTOI(px, py, dx, dy, ax, ay, radius);
    }

    let lowestT = Infinity;

    // Already overlapping at t = 0
    if (distancePointToSegmentSquared(px, py, ax, ay, bx, by) <= radius * radius) {
        return 0;
    }

    const abLen = Math.sqrt(abLenSq);
    const tangentX = abX / abLen;
    const tangentY = abY / abLen;
    const normalX = -tangentY;
    const normalY = tangentX;

    // 1) Infinite-line hits, then clamp to segment interior
    const signedDist = (px - ax) * normalX + (py - ay) * normalY;
    const vn = dx * normalX + dy * normalY;

    if (Math.abs(vn) > EPSILON) {
        const t0 = (radius - signedDist) / vn;
        const t1 = (-radius - signedDist) / vn;

        if (t0 >= 0 && t0 <= 1) {
            const hitX = px + dx * t0;
            const hitY = py + dy * t0;
            const proj = (hitX - ax) * tangentX + (hitY - ay) * tangentY;

            if (proj >= 0 && proj <= abLen) {
                lowestT = Math.min(lowestT, t0);
            }
        }

        if (t1 >= 0 && t1 <= 1) {
            const hitX = px + dx * t1;
            const hitY = py + dy * t1;
            const proj = (hitX - ax) * tangentX + (hitY - ay) * tangentY;

            if (proj >= 0 && proj <= abLen) {
                lowestT = Math.min(lowestT, t1);
            }
        }
    }

    // 2) Endpoint A
    const tA = sweepPointVsPointRadiusTOI(px, py, dx, dy, ax, ay, radius);
    if (tA != null) lowestT = Math.min(lowestT, tA);

    // 3) Endpoint B
    const tB = sweepPointVsPointRadiusTOI(px, py, dx, dy, bx, by, radius);
    if (tB != null) lowestT = Math.min(lowestT, tB);

    return lowestT !== Infinity ? lowestT : null;
}

function sweepCircleVsPolygonTOI(
    px: number,
    py: number,
    dx: number,
    dy: number,
    radius: number,
    bodyB: RigidBody,
): number | null {
    const polygon = bodyB.shape as PolygonShape;

    const vertices = polygon.worldVertices;
    const normals = polygon.worldNormals;

    let lowestT = Infinity;

    // Already overlapping at t = 0
    if (pointInInflatedPolygon(px, py, vertices, normals, radius)) {
        return 0;
    }

    // 1) Face hits: solve signed distance to each face offset by radius
    for (let i = 0; i < vertices.length; i++) {
        const v0 = vertices[i];
        const normal = normals[i]; // outward normal
        const normalX = normal.x;
        const normalY = normal.y;

        const dist0 = (px - v0.x) * normalX + (py - v0.y) * normalY;
        const vn = dx * normalX + dy * normalY;

        // Need to move toward the face
        if (vn >= -EPSILON) continue;

        // Hit when center reaches the face expanded outward by radius
        const t = (radius - dist0) / vn;

        if (t < 0 || t > 1) continue;

        const hitX = px + dx * t;
        const hitY = py + dy * t;

        // Check that the projected contact lies on this edge segment, not outside near vertices
        const v1 = vertices[(i + 1) % vertices.length];
        const edgeX = v1.x - v0.x;
        const edgeY = v1.y - v0.y;
        const edgeLenSq = edgeX * edgeX + edgeY * edgeY;

        if (edgeLenSq <= EPSILON) continue;

        const contactX = hitX - normalX * radius;
        const contactY = hitY - normalY * radius;
        const proj = ((contactX - v0.x) * edgeX + (contactY - v0.y) * edgeY) / edgeLenSq;

        if (proj >= 0 && proj <= 1) {
            if (t < lowestT) lowestT = t;
        }
    }

    // 2) Vertex hits: sweep point vs circle(radius) for every polygon vertex
    for (let i = 0; i < vertices.length; i++) {
        const vertex = vertices[i];
        const t = sweepPointVsPointRadiusTOI(px, py, dx, dy, vertex.x, vertex.y, radius);
        if (t != null && t < lowestT) {
            lowestT = t;
        }
    }

    return lowestT !== Infinity ? lowestT : null;
}

// Checks whether point p is inside polygon inflated by radius.
// For a convex polygon with outward normals, point is inside inflated polygon
// if it is not farther than radius outside any face.
function pointInInflatedPolygon(px: number, py: number, vertices: Vec2[], normals: Vec2[], radius: number): boolean {
    for (let i = 0; i < vertices.length; i++) {
        const vertex = vertices[i];
        const normal = normals[i];
        const dist = (px - vertex.x) * normal.x + (py - vertex.y) * normal.y;
        if (dist > radius) {
            return false;
        }
    }
    return true;
}
