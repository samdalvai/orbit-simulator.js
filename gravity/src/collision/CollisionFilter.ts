import { RigidBody } from '../core/RigidBody';

export const enum CollisionCategory {
    NONE = 0,
    DEFAULT = 1 << 0,
    PROJECTILE = 1 << 1,
    PARTICLE = 1 << 2,
    SENSOR = 1 << 3,
    LAYER1 = 1 << 4,
    LAYER2 = 1 << 5,
    LAYER3 = 1 << 6,
    ALL = 0xffffffff,
}

/**
 * Returns `true` only when both filters opt into the collision.
 *
 * In other words:
 * - `a.mask` must include `b.category`
 * - `b.mask` must include `a.category`
 *
 * Simple cases:
 * - `{ collisionCategory: CollisionCategory.DEFAULT, collisionMask: CollisionCategory.ALL }`
 *   collides with every category.
 * - `{ collisionCategory: CollisionCategory.SENSOR, collisionMask: CollisionCategory.NONE }`
 *   collides with nothing.
 * - `{ collisionCategory: CollisionCategory.PROJECTILE, collisionMask: CollisionCategory.DEFAULT }`
 *   collides only with bodies in the `DEFAULT` category.
 */
export function canCollide(a: RigidBody, b: RigidBody): boolean {
    return (a.collisionMask & b.collisionCategory) !== 0 && (b.collisionMask & a.collisionCategory) !== 0;
}
