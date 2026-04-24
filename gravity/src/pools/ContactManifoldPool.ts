import { ContactManifold } from '../collision/ContactManifold';
import { RigidBody } from '../core/RigidBody';

export class ContactManifoldPool {
    private readonly manifolds: ContactManifold[] = [];

    constructor(initialCapacity = 0) {
        for (let i = 0; i < initialCapacity; i++) {
            this.manifolds.push(new ContactManifold());
        }
    }

    acquire(
        bodyA: RigidBody,
        bodyB: RigidBody,
        contactCount: number,
        penetrationDepth: number,
        contactNormalX: number,
        contactNormalY: number,
        contactPoint0X: number,
        contactPoint0Y: number,
        contactPoint0Id: number,
        contactPoint1X: number,
        contactPoint1Y: number,
        contactPoint1Id: number,
        featureFlipped: boolean,
    ): ContactManifold {
        const manifold = this.manifolds.pop();

        if (manifold != null) {
            manifold.init(
                bodyA,
                bodyB,
                contactCount,
                penetrationDepth,
                contactNormalX,
                contactNormalY,
                contactPoint0X,
                contactPoint0Y,
                contactPoint0Id,
                contactPoint1X,
                contactPoint1Y,
                contactPoint1Id,
                featureFlipped,
            );
            return manifold;
        }

        return new ContactManifold(
            bodyA,
            bodyB,
            contactCount,
            penetrationDepth,
            contactNormalX,
            contactNormalY,
            contactPoint0X,
            contactPoint0Y,
            contactPoint0Id,
            contactPoint1X,
            contactPoint1Y,
            contactPoint1Id,
            featureFlipped,
        );
    }

    release(manifold: ContactManifold): void {
        this.manifolds.push(manifold);
    }
}
