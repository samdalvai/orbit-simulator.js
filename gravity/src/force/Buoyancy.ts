import { SETTINGS } from '../core/Constants';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { CapsuleShape } from '../shapes/CapsuleShape';
import { CircleShape } from '../shapes/CircleShape';
import { PolygonShape } from '../shapes/PolygonShape';
import { ShapeType } from '../shapes/Shape';

// TODO: should we refactor behaviour to automatically apply all the forces needed instead of relying on docs?
// this holds true for all types of forces

type BuoyancyResult = {
    submergedArea: number;
    force: Vec2;
    applicationPoint: Vec2;
} | null;

type SubmergedShapeResult = {
    area: number;
    centroid: Vec2;
} | null;

/**
 * Computes buoyancy force based on submerged area of a body shaope
 *
 * @param body The optionally submerged body
 * @param liquidSurfaceY The liquid surface max y coordinates
 * @param liquidDensity The liquid density
 * @param gravity The world gfravity
 * @returns The submerged area, the buoyancy force and the centroid where to apply it
 *
 * The force should be applied by using {@link RigidBody.addForceAtPoint}. Should be used in combination with {@link generateLinearWaterDragForce} and {@link generateAngularWaterDragTorque} for realistic behaviour
 */
export function generateBuoyancyForce(
    body: RigidBody,
    liquidSurfaceY: number,
    liquidDensity: number,
    gravity: number,
): BuoyancyResult {
    if (body.shapeType === ShapeType.POLYGON || body.shapeType === ShapeType.BOX) {
        const polygon = body.shape as PolygonShape;
        const vertices = polygon.worldVertices;

        const result = getSubmergedPolygonData(vertices, liquidSurfaceY);

        if (!result) {
            return null;
        }

        const submergedArea = result.area;
        const buoyancyMagnitude = liquidDensity * submergedArea * gravity;
        const force = new Vec2(0, buoyancyMagnitude);

        return {
            submergedArea,
            force,
            applicationPoint: result.centroid,
        };
    }

    if (body.shapeType === ShapeType.CIRCLE) {
        const circle = body.shape as CircleShape;
        const r = circle.radius;

        const result = getSubmergedCircleData(body.position, r, liquidSurfaceY);

        if (!result) {
            return null;
        }

        const submergedArea = result.area;
        const buoyancyMagnitude = liquidDensity * submergedArea * gravity;
        const force = new Vec2(0, buoyancyMagnitude);

        return {
            submergedArea,
            force,
            applicationPoint: result.centroid,
        };
    }

    if (body.shapeType === ShapeType.CAPSULE) {
        const capsule = body.shape as CapsuleShape;
        const axis = capsule.worldCenter1.subNew(capsule.worldCenter2);
        const axisLength = Math.sqrt(axis.magnitudeSquared());

        // Capsule is basically a circle
        if (axisLength === 0) {
            const result = getSubmergedCircleData(body.position, capsule.radius, liquidSurfaceY);

            if (!result) {
                return null;
            }

            const submergedArea = result.area;
            const buoyancyMagnitude = liquidDensity * submergedArea * gravity;
            const force = new Vec2(0, buoyancyMagnitude);

            return {
                submergedArea,
                force,
                applicationPoint: result.centroid,
            };
        }

        const axisDirection = axis.divNew(axisLength);

        // We approximate the whole capsule as a polygon, with caps made by segments, then we compute
        // buoyancy and centroid for the approximated polygon
        const topCapVertices = buildHalfDiskVertices(capsule.worldCenter1, axisDirection, capsule.radius);
        const bottomCapVertices = buildHalfDiskVertices(
            capsule.worldCenter2,
            axisDirection.negateNew(),
            capsule.radius,
        );

        const capsuleVertices: Vec2[] = [];

        for (let i = 0; i < topCapVertices.length; i++) {
            capsuleVertices.push(topCapVertices[i]);
        }

        for (let i = 0; i < bottomCapVertices.length; i++) {
            capsuleVertices.push(bottomCapVertices[i]);
        }

        const result = getSubmergedPolygonData(capsuleVertices, liquidSurfaceY);

        if (!result) {
            return null;
        }

        const submergedArea = result.area;
        const buoyancyMagnitude = liquidDensity * submergedArea * gravity;
        const force = new Vec2(0, buoyancyMagnitude);

        return {
            submergedArea,
            force,
            applicationPoint: result.centroid,
        };
    }

    // Approximation if there is no algorithm to compute the real buoyancy
    return approximateBuoyancy(body, liquidSurfaceY, liquidDensity, gravity);
}

function getSubmergedPolygonData(vertices: readonly Vec2[], waterSurfaceY: number): SubmergedShapeResult {
    const clipped: Vec2[] = [];

    for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];

        const aUnder = a.y <= waterSurfaceY;
        const bUnder = b.y <= waterSurfaceY;

        if (aUnder) {
            clipped.push(a.copy());
        }

        if (aUnder !== bUnder) {
            const t = (waterSurfaceY - a.y) / (b.y - a.y);
            const x = a.x + (b.x - a.x) * t;
            clipped.push(new Vec2(x, waterSurfaceY));
        }
    }

    if (clipped.length < 3) {
        return null;
    }

    let doubleArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < clipped.length; i++) {
        const current = clipped[i];
        const next = clipped[(i + 1) % clipped.length];

        const cross = current.cross(next);
        doubleArea += cross;
        cx += (current.x + next.x) * cross;
        cy += (current.y + next.y) * cross;
    }

    if (doubleArea === 0) {
        return null;
    }

    const factor = 1 / (3 * doubleArea);
    const centroid = new Vec2(cx * factor, cy * factor);

    return {
        area: Math.abs(doubleArea) * 0.5,
        centroid,
    };
}

function getSubmergedCircleData(center: Vec2, radius: number, waterSurfaceY: number): SubmergedShapeResult {
    const cx = center.x;
    const cy = center.y;

    const d = waterSurfaceY - cy;

    // Fully above
    if (d <= -radius) {
        return null;
    }

    // Fully submerged
    if (d >= radius) {
        const area = Math.PI * radius * radius;
        return {
            area: area,
            centroid: center.copy(),
        };
    }

    const area = radius * radius * Math.acos(-d / radius) + d * Math.sqrt(radius * radius - d * d);

    const a = Math.sqrt(radius * radius - d * d);
    const yOffset = -(2 * Math.pow(a, 3)) / (3 * area);
    const centroid = new Vec2(cx, cy + yOffset);

    return {
        area: area,
        centroid,
    };
}

function buildHalfDiskVertices(center: Vec2, axisDirection: Vec2, radius: number, segments = 32): Vec2[] {
    const axisDirectionLength = Math.sqrt(axisDirection.magnitudeSquared());

    if (axisDirectionLength === 0) {
        return [];
    }

    const normal = axisDirection.divNew(axisDirectionLength);
    const vertices: Vec2[] = [];

    // Approximate the capsule cap with a half-disk so it does not overlap the inner body rectangle.
    for (let i = 0; i <= segments; i++) {
        const angle = -Math.PI / 2 + (i / segments) * Math.PI;
        const point = center.addNew(normal.rotate(angle).scaleNew(radius));
        vertices.push(point);
    }

    return vertices;
}

function approximateBuoyancy(
    body: RigidBody,
    waterSurfaceY: number,
    liquidDensity: number,
    gravity: number,
): BuoyancyResult {
    const maxX = body.maxX;
    const minX = body.minX;
    const maxY = body.maxY;
    const minY = body.minY;

    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 0 || height <= 0) {
        return null;
    }

    // Amount of the AABB below the water surface
    const submergedHeight = Math.max(0, Math.min(waterSurfaceY - minY, height));

    if (submergedHeight === 0) {
        return null;
    }

    const submergedFraction = submergedHeight / height;
    const submergedArea = body.shape.getArea() * submergedFraction;
    const buoyancyMagnitude = liquidDensity * submergedArea * gravity;
    const force = new Vec2(0, buoyancyMagnitude);
    const applicationPoint = body.position.copy();

    return {
        submergedArea,
        force,
        applicationPoint,
    };
}

export function generateLinearWaterDragForce(
    body: RigidBody,
    submergedArea: number,
    liquidDensity: number,
    dragCoefficient: number,
    dt: number,
): Vec2 {
    const totalArea = body.shape.getArea();

    if (totalArea <= 0 || submergedArea <= 0) {
        return new Vec2(0, 0);
    }

    const submergedFraction = submergedArea / totalArea;

    const v = body.velocity;
    const speedSq = v.magnitudeSquared();

    if (speedSq === 0) {
        return new Vec2(0, 0);
    }

    const speed = Math.sqrt(speedSq);

    let dragMagnitude = 0.5 * liquidDensity * dragCoefficient * speedSq * submergedFraction;

    if (dt > 0) {
        const maxForce = (body.mass * speed) / dt;
        dragMagnitude = Math.min(dragMagnitude, maxForce);
    }

    return v.scaleNew(-dragMagnitude / speed);
}

export function generateAngularWaterDragTorque(
    body: RigidBody,
    submergedArea: number,
    liquidDensity: number,
    angularDragCoefficient: number,
): number {
    const totalArea = body.shape.getArea();

    if (totalArea <= 0 || submergedArea <= 0) {
        return 0;
    }

    const submergedFraction = submergedArea / totalArea;

    return -body.angularVelocity * angularDragCoefficient * liquidDensity * submergedFraction * body.I;
}

/**
 * Convenience version that applies buoyancy with linear and angular drag to a body
 */
export function applyBuoyancyForces(
    body: RigidBody,
    liquidSurfaceY: number,
    liquidDensity: number,
    gravity: number,
    linearDragCoefficient = 1,
    angularDragCoefficient = 1,
) {
    const buoyancy = generateBuoyancyForce(body, liquidSurfaceY, liquidDensity, gravity);

    if (buoyancy) {
        body.addForceAtPoint(buoyancy.force, buoyancy.applicationPoint);

        const waterDrag = generateLinearWaterDragForce(
            body,
            buoyancy.submergedArea,
            liquidDensity,
            linearDragCoefficient,
            SETTINGS.dt,
        );
        const waterAngularDrag = generateAngularWaterDragTorque(
            body,
            buoyancy.submergedArea,
            liquidDensity,
            angularDragCoefficient,
        );
        body.addForce(waterDrag);
        body.addTorque(waterAngularDrag);
    }
}
