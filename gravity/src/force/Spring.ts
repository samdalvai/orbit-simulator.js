import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';

export function generateSpringForceBodyAnchor(body: RigidBody, anchor: Vec2, restLength: number, k: number): Vec2 {
    // Calculate the distance between the anchor and the object
    const d = body.position.subNew(anchor);

    // Find the spring displacement considering the rest length
    const displacement = d.magnitude() - restLength;

    // Calculate the direction of the spring force
    const springDirection = d.unitVector();

    // Calculate the magnitude of the spring force
    const sprintMagnitude = -k * displacement;

    // Calculate the final resulting spring force vector
    return springDirection.scaleNew(sprintMagnitude);
}

export function generateSpringForceBodyBody(a: RigidBody, b: RigidBody, restLength: number, k: number): Vec2 {
    // Calculate the distance between the two bodys
    const d = a.position.subNew(b.position);

    // Find the spring displacement considering the rest length
    const displacement = d.magnitude() - restLength;

    // Calculate the direction of the spring force
    const springDirection = d.unitVector();

    // Calculate the magnitude of the spring force
    const sprintMagnitude = -k * displacement;

    // Calculate the final resulting spring force vector
    return springDirection.scaleNew(sprintMagnitude);
}
