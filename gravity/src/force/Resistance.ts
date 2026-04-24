import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';

export function generateDragForce(body: RigidBody, k: number, dt: number): Vec2 {
    const v = body.velocity;

    if (v.magnitudeSquared() === 0) {
        return new Vec2(0, 0);
    }

    const speed = v.magnitude();
    const dragDir = v.scaleNew(-1 / speed); // normalized opposite direction

    // Drag force magnitude: k * v^2
    let dragMagnitude = k * speed * speed;

    // Compute max force that would bring velocity to zero this step
    const maxForce = (body.mass * speed) / dt;

    // Clamp drag so it never reverses velocity
    dragMagnitude = Math.min(dragMagnitude, maxForce);

    return dragDir.scaleNew(dragMagnitude);
}

export function generateFrictionForce(body: RigidBody, k: number): Vec2 {
    // Calculate the friction direction (inverse of velocity unit vector)
    const frictionDirection = body.velocity.unitVector().scaleNew(-1);

    // Calculate the friction magnitude (just k, for now)
    const frictionMagnitude = k;

    // Calculate the final resulting friction force vector
    return frictionDirection.scaleNew(frictionMagnitude);
}
