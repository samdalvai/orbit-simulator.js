import { Constraint } from '../constraint/Constraint';
import { SETTINGS } from '../core/Constants';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import * as Utils from '../utils/Utils';

export interface ContactInfo {
    // Relevant contact infos
    bodyA: RigidBody;
    bodyB: RigidBody;
    impulseSum: number;
}

export class ContactManifold extends Constraint {
    // Contact informations
    public penetrationDepth!: number;

    public contactNormalX!: number;
    public contactNormalY!: number;
    public contactTangentX!: number;
    public contactTangentY!: number;

    public contactPoint0X!: number;
    public contactPoint0Y!: number;
    public contactPoint0Id!: number;

    public contactPoint1X!: number;
    public contactPoint1Y!: number;
    public contactPoint1Id!: number;

    private contactCount!: number;

    private beta!: number;
    private restitution!: number;
    private friction!: number;
    private featureFlipped!: boolean;
    public persistent = false;

    public normalJvaX = 0.0;
    public normalJvaY = 0.0;
    public normalJvbX = 0.0;
    public normalJvbY = 0.0;

    public tangentJvaX = 0.0;
    public tangentJvaY = 0.0;
    public tangentJvbX = 0.0;
    public tangentJvbY = 0.0;

    public normalJwa0 = 0.0;
    public normalJwb0 = 0.0;
    public tangentJwa0 = 0.0;
    public tangentJwb0 = 0.0;
    public normalBias0 = 0.0;
    public tangentBias0 = 0.0;
    public normalEffectiveMass0 = 0.0;
    public tangentEffectiveMass0 = 0.0;
    public normalImpulseSum0 = 0.0;
    public tangentImpulseSum0 = 0.0;

    public normalJwa1 = 0.0;
    public normalJwb1 = 0.0;
    public tangentJwa1 = 0.0;
    public tangentJwb1 = 0.0;
    public normalBias1 = 0.0;
    public tangentBias1 = 0.0;
    public normalEffectiveMass1 = 0.0;
    public tangentEffectiveMass1 = 0.0;
    public normalImpulseSum1 = 0.0;
    public tangentImpulseSum1 = 0.0;

    private blockK00 = 0.0;
    private blockK01 = 0.0;
    private blockK11 = 0.0;
    private blockM00 = 0.0;
    private blockM01 = 0.0;
    private blockM11 = 0.0;

    constructor();
    constructor(
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
    );
    constructor(
        bodyA?: RigidBody,
        bodyB?: RigidBody,
        contactCount?: number,
        penetrationDepth?: number,
        contactNormalX?: number,
        contactNormalY?: number,
        contactPoint0X?: number,
        contactPoint0Y?: number,
        contactPoint0Id?: number,
        contactPoint1X?: number,
        contactPoint1Y?: number,
        contactPoint1Id?: number,
        featureFlipped?: boolean,
    ) {
        super(bodyA as RigidBody, bodyB as RigidBody);

        if (
            bodyA != null &&
            bodyB != null &&
            contactCount != null &&
            penetrationDepth != null &&
            contactNormalX != null &&
            contactNormalY != null &&
            contactPoint0X != null &&
            contactPoint0Y != null &&
            contactPoint0Id != null &&
            contactPoint1X != null &&
            contactPoint1Y != null &&
            contactPoint1Id != null &&
            featureFlipped != null
        ) {
            this.init(
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
    }

    init(
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
    ): void {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.penetrationDepth = penetrationDepth;
        this.contactNormalX = contactNormalX;
        this.contactNormalY = contactNormalY;
        this.contactTangentX = -contactNormalY;
        this.contactTangentY = contactNormalX;

        this.contactCount = contactCount;

        this.contactPoint0X = contactPoint0X;
        this.contactPoint0Y = contactPoint0Y;
        this.contactPoint0Id = contactPoint0Id;

        if (this.contactCount === 2) {
            this.contactPoint1X = contactPoint1X;
            this.contactPoint1Y = contactPoint1Y;
            this.contactPoint1Id = contactPoint1Id;
        } else {
            this.contactPoint1X = 0.0;
            this.contactPoint1Y = 0.0;
            this.contactPoint1Id = 0;
        }

        this.featureFlipped = featureFlipped;

        this.beta = SETTINGS.positionCorrectionBeta;
        this.restitution = this.bodyA.restitution * this.bodyB.restitution;
        this.friction = this.bodyA.friction * this.bodyB.friction;

        this.normalJvaX = -this.contactNormalX;
        this.normalJvaY = -this.contactNormalY;
        this.normalJvbX = this.contactNormalX;
        this.normalJvbY = this.contactNormalY;

        this.tangentJvaX = -this.contactTangentX;
        this.tangentJvaY = -this.contactTangentY;
        this.tangentJvbX = this.contactTangentX;
        this.tangentJvbY = this.contactTangentY;

        this.persistent = false;

        this.normalJwa0 = 0.0;
        this.normalJwb0 = 0.0;
        this.tangentJwa0 = 0.0;
        this.tangentJwb0 = 0.0;
        this.normalBias0 = 0.0;
        this.tangentBias0 = 0.0;
        this.normalEffectiveMass0 = 0.0;
        this.tangentEffectiveMass0 = 0.0;
        this.normalImpulseSum0 = 0.0;
        this.tangentImpulseSum0 = 0.0;

        this.normalJwa1 = 0.0;
        this.normalJwb1 = 0.0;
        this.tangentJwa1 = 0.0;
        this.tangentJwb1 = 0.0;
        this.normalBias1 = 0.0;
        this.tangentBias1 = 0.0;
        this.normalEffectiveMass1 = 0.0;
        this.tangentEffectiveMass1 = 0.0;
        this.normalImpulseSum1 = 0.0;
        this.tangentImpulseSum1 = 0.0;

        this.blockK00 = 0.0;
        this.blockK01 = 0.0;
        this.blockK11 = 0.0;
        this.blockM00 = 0.0;
        this.blockM01 = 0.0;
        this.blockM11 = 0.0;
    }

    override preSolve(invDt: number): void {
        const tangentBias = this.featureFlipped
            ? this.bodyB.surfaceSpeed - this.bodyA.surfaceSpeed
            : this.bodyA.surfaceSpeed - this.bodyB.surfaceSpeed;

        for (let i = 0; i < this.numContacts; i++) {
            this.preSolveContact(i, tangentBias, invDt);
        }

        if (this.numContacts === 2 && SETTINGS.blockSolve) {
            this.preSolveBlock();
        }
    }

    override solve(): void {
        for (let i = 0; i < this.numContacts; i++) {
            this.solveTangentContact(i);
        }

        if (this.numContacts === 1 || !SETTINGS.blockSolve) {
            for (let i = 0; i < this.numContacts; i++) {
                this.solveNormalContact(i);
            }
        } else {
            this.solveBlock();
        }
    }

    tryWarmStart(oldManifold: ContactManifold) {
        if (
            this.matchesContact(
                this.contactPoint0X,
                this.contactPoint0Y,
                this.contactPoint0Id,
                oldManifold.contactPoint0X,
                oldManifold.contactPoint0Y,
                oldManifold.contactPoint0Id,
            )
        ) {
            this.copyWarmStartImpulse(0, oldManifold, 0);
        } else if (
            oldManifold.numContacts === 2 &&
            this.matchesContact(
                this.contactPoint0X,
                this.contactPoint0Y,
                this.contactPoint0Id,
                oldManifold.contactPoint1X,
                oldManifold.contactPoint1Y,
                oldManifold.contactPoint1Id,
            )
        ) {
            this.copyWarmStartImpulse(0, oldManifold, 1);
        }

        if (this.numContacts === 2) {
            if (
                this.matchesContact(
                    this.contactPoint1X,
                    this.contactPoint1Y,
                    this.contactPoint1Id,
                    oldManifold.contactPoint0X,
                    oldManifold.contactPoint0Y,
                    oldManifold.contactPoint0Id,
                )
            ) {
                this.copyWarmStartImpulse(1, oldManifold, 0);
            } else if (
                oldManifold.numContacts === 2 &&
                this.matchesContact(
                    this.contactPoint1X,
                    this.contactPoint1Y,
                    this.contactPoint1Id,
                    oldManifold.contactPoint1X,
                    oldManifold.contactPoint1Y,
                    oldManifold.contactPoint1Id,
                )
            ) {
                this.copyWarmStartImpulse(1, oldManifold, 1);
            }
        }
    }

    private preSolveContact(index: number, tangentBias: number, invDt: number): void {
        const contactPointX = index === 0 ? this.contactPoint0X : this.contactPoint1X;
        const contactPointY = index === 0 ? this.contactPoint0Y : this.contactPoint1Y;

        const bodyAPosition = this.bodyA.position;
        const bodyBPosition = this.bodyB.position;
        const raX = contactPointX - bodyAPosition.x;
        const raY = contactPointY - bodyAPosition.y;
        const rbX = contactPointX - bodyBPosition.x;
        const rbY = contactPointY - bodyBPosition.y;

        const normalJwa = raY * this.contactNormalX - raX * this.contactNormalY;
        const normalJwb = rbX * this.contactNormalY - rbY * this.contactNormalX;
        const tangentJwa = raY * this.contactTangentX - raX * this.contactTangentY;
        const tangentJwb = rbX * this.contactTangentY - rbY * this.contactTangentX;

        let normalBias = 0.0;
        if (SETTINGS.positionCorrection || !this.persistent) {
            const bodyAVelocity = this.bodyA.velocity;
            const bodyBVelocity = this.bodyB.velocity;
            const bodyAAngularVelocity = this.bodyA.angularVelocity;
            const bodyBAngularVelocity = this.bodyB.angularVelocity;
            const relativeVelocityX =
                bodyBVelocity.x - bodyBAngularVelocity * rbY - (bodyAVelocity.x - bodyAAngularVelocity * raY);
            const relativeVelocityY =
                bodyBVelocity.y + bodyBAngularVelocity * rbX - (bodyAVelocity.y + bodyAAngularVelocity * raX);
            const normalVelocity = this.contactNormalX * relativeVelocityX + this.contactNormalY * relativeVelocityY;

            if (SETTINGS.positionCorrection && invDt > 0.0) {
                normalBias = -(this.beta * invDt) * Math.max(this.penetrationDepth - SETTINGS.penetrationSlop, 0.0);
            }

            if (!this.persistent && normalVelocity + SETTINGS.restitutionSlop < 0.0) {
                normalBias += this.restitution * normalVelocity;
            }
        }

        const bodyAInvMass = this.bodyA.invMass;
        const bodyAInvI = this.bodyA.invI;
        const bodyBInvMass = this.bodyB.invMass;
        const bodyBInvI = this.bodyB.invI;

        const normalK =
            bodyAInvMass + normalJwa * bodyAInvI * normalJwa + bodyBInvMass + normalJwb * bodyBInvI * normalJwb;

        const tangentK =
            bodyAInvMass + tangentJwa * bodyAInvI * tangentJwa + bodyBInvMass + tangentJwb * bodyBInvI * tangentJwb;

        const normalEffectiveMass = normalK > 0.0 ? 1.0 / normalK : 0.0;
        const tangentEffectiveMass = tangentK > 0.0 ? 1.0 / tangentK : 0.0;

        if (index === 0) {
            this.normalJwa0 = normalJwa;
            this.normalJwb0 = normalJwb;
            this.tangentJwa0 = tangentJwa;
            this.tangentJwb0 = tangentJwb;
            this.normalBias0 = normalBias;
            this.tangentBias0 = tangentBias;
            this.normalEffectiveMass0 = normalEffectiveMass;
            this.tangentEffectiveMass0 = tangentEffectiveMass;

            if (SETTINGS.warmStarting) {
                this.applyNormalImpulse(0, this.normalImpulseSum0);
                this.applyTangentImpulse(0, this.tangentImpulseSum0);
            }
        } else {
            this.normalJwa1 = normalJwa;
            this.normalJwb1 = normalJwb;
            this.tangentJwa1 = tangentJwa;
            this.tangentJwb1 = tangentJwb;
            this.normalBias1 = normalBias;
            this.tangentBias1 = tangentBias;
            this.normalEffectiveMass1 = normalEffectiveMass;
            this.tangentEffectiveMass1 = tangentEffectiveMass;

            if (SETTINGS.warmStarting) {
                this.applyNormalImpulse(1, this.normalImpulseSum1);
                this.applyTangentImpulse(1, this.tangentImpulseSum1);
            }
        }
    }

    private preSolveBlock(): void {
        const bodyAInvMass = this.bodyA.invMass;
        const bodyAInvI = this.bodyA.invI;
        const bodyBInvMass = this.bodyB.invMass;
        const bodyBInvI = this.bodyB.invI;

        this.blockK00 =
            bodyAInvMass +
            this.normalJwa0 * bodyAInvI * this.normalJwa0 +
            bodyBInvMass +
            this.normalJwb0 * bodyBInvI * this.normalJwb0;

        this.blockK11 =
            bodyAInvMass +
            this.normalJwa1 * bodyAInvI * this.normalJwa1 +
            bodyBInvMass +
            this.normalJwb1 * bodyBInvI * this.normalJwb1;

        this.blockK01 =
            bodyAInvMass +
            this.normalJwa0 * bodyAInvI * this.normalJwa1 +
            bodyBInvMass +
            this.normalJwb0 * bodyBInvI * this.normalJwb1;

        const determinant = this.blockK00 * this.blockK11 - this.blockK01 * this.blockK01;
        Utils.assert(determinant !== 0.0, 'Determinant is 0');

        const invDeterminant = 1.0 / determinant;
        this.blockM00 = invDeterminant * this.blockK11;
        this.blockM01 = -invDeterminant * this.blockK01;
        this.blockM11 = invDeterminant * this.blockK00;
    }

    private solveNormalContact(index: number): void {
        const normalJwa = index === 0 ? this.normalJwa0 : this.normalJwa1;
        const normalJwb = index === 0 ? this.normalJwb0 : this.normalJwb1;
        const normalBias = index === 0 ? this.normalBias0 : this.normalBias1;
        const normalEffectiveMass = index === 0 ? this.normalEffectiveMass0 : this.normalEffectiveMass1;
        const oldImpulseSum = index === 0 ? this.normalImpulseSum0 : this.normalImpulseSum1;

        const bodyAVelocity = this.bodyA.velocity;
        const bodyBVelocity = this.bodyB.velocity;
        const jv =
            this.normalJvaX * bodyAVelocity.x +
            this.normalJvaY * bodyAVelocity.y +
            normalJwa * this.bodyA.angularVelocity +
            this.normalJvbX * bodyBVelocity.x +
            this.normalJvbY * bodyBVelocity.y +
            normalJwb * this.bodyB.angularVelocity;

        let lambda = normalEffectiveMass * -(jv + normalBias);
        let impulseSum = oldImpulseSum;

        if (SETTINGS.impulseAccumulation) {
            impulseSum = Math.max(0.0, oldImpulseSum + lambda);
            lambda = impulseSum - oldImpulseSum;
        } else {
            impulseSum = Math.max(0.0, lambda);
            lambda = impulseSum;
        }

        if (index === 0) {
            this.normalImpulseSum0 = impulseSum;
        } else {
            this.normalImpulseSum1 = impulseSum;
        }

        this.applyNormalImpulse(index, lambda);
    }

    private solveBlock(): void {
        const aX = this.normalImpulseSum0;
        const aY = this.normalImpulseSum1;
        Utils.assert(aX >= 0.0, aY >= 0.0);

        const bodyAVelocity = this.bodyA.velocity;
        const bodyBVelocity = this.bodyB.velocity;
        const bodyAAngularVelocity = this.bodyA.angularVelocity;
        const bodyBAngularVelocity = this.bodyB.angularVelocity;

        let vn1 =
            this.normalJvaX * bodyAVelocity.x +
            this.normalJvaY * bodyAVelocity.y +
            this.normalJwa0 * bodyAAngularVelocity +
            this.normalJvbX * bodyBVelocity.x +
            this.normalJvbY * bodyBVelocity.y +
            this.normalJwb0 * bodyBAngularVelocity;

        let vn2 =
            this.normalJvaX * bodyAVelocity.x +
            this.normalJvaY * bodyAVelocity.y +
            this.normalJwa1 * bodyAAngularVelocity +
            this.normalJvbX * bodyBVelocity.x +
            this.normalJvbY * bodyBVelocity.y +
            this.normalJwb1 * bodyBAngularVelocity;

        let bX = vn1 + this.normalBias0;
        let bY = vn2 + this.normalBias1;

        bX -= this.blockK00 * aX + this.blockK01 * aY;
        bY -= this.blockK01 * aX + this.blockK11 * aY;

        let xX = -(this.blockM00 * bX + this.blockM01 * bY);
        let xY = -(this.blockM01 * bX + this.blockM11 * bY);
        let solved = xX >= 0.0 && xY >= 0.0;

        if (!solved) {
            xX = this.normalEffectiveMass0 * -bX;
            xY = 0.0;
            vn1 = 0.0;
            vn2 = this.blockK01 * xX + bY;
            solved = xX >= 0.0 && vn2 >= 0.0;
        }

        if (!solved) {
            xX = 0.0;
            xY = this.normalEffectiveMass1 * -bY;
            vn1 = this.blockK01 * xY + bX;
            vn2 = 0.0;
            solved = xY >= 0.0 && vn1 >= 0.0;
        }

        if (!solved) {
            xX = 0.0;
            xY = 0.0;
            vn1 = bX;
            vn2 = bY;
            solved = vn1 >= 0.0 && vn2 >= 0.0;
        }

        if (!solved) {
            console.error('Error solving contact block: ', this);
            Utils.assert(false);
        }

        this.applyBlockImpulse(xX - aX, xY - aY);

        this.normalImpulseSum0 = xX;
        this.normalImpulseSum1 = xY;
    }

    private solveTangentContact(index: number): void {
        const tangentJwa = index === 0 ? this.tangentJwa0 : this.tangentJwa1;
        const tangentJwb = index === 0 ? this.tangentJwb0 : this.tangentJwb1;
        const tangentBias = index === 0 ? this.tangentBias0 : this.tangentBias1;
        const tangentEffectiveMass = index === 0 ? this.tangentEffectiveMass0 : this.tangentEffectiveMass1;
        const oldImpulseSum = index === 0 ? this.tangentImpulseSum0 : this.tangentImpulseSum1;
        const maxFriction = this.friction * (index === 0 ? this.normalImpulseSum0 : this.normalImpulseSum1);

        const bodyAVelocity = this.bodyA.velocity;
        const bodyBVelocity = this.bodyB.velocity;
        const jv =
            this.tangentJvaX * bodyAVelocity.x +
            this.tangentJvaY * bodyAVelocity.y +
            tangentJwa * this.bodyA.angularVelocity +
            this.tangentJvbX * bodyBVelocity.x +
            this.tangentJvbY * bodyBVelocity.y +
            tangentJwb * this.bodyB.angularVelocity;

        let lambda = tangentEffectiveMass * -(jv + tangentBias);
        let impulseSum = oldImpulseSum;

        if (SETTINGS.impulseAccumulation) {
            impulseSum = Utils.clamp(oldImpulseSum + lambda, -maxFriction, maxFriction);
            lambda = impulseSum - oldImpulseSum;
        } else {
            impulseSum = Utils.clamp(lambda, -maxFriction, maxFriction);
            lambda = impulseSum;
        }

        if (index === 0) {
            this.tangentImpulseSum0 = impulseSum;
        } else {
            this.tangentImpulseSum1 = impulseSum;
        }

        this.applyTangentImpulse(index, lambda);
    }

    private applyNormalImpulse(index: number, lambda: number): void {
        if (lambda === 0.0) {
            return;
        }

        const bodyAImpulseScale = this.bodyA.invMass * lambda;
        this.bodyA.velocity.x += this.normalJvaX * bodyAImpulseScale;
        this.bodyA.velocity.y += this.normalJvaY * bodyAImpulseScale;
        this.bodyA.angularVelocity += this.bodyA.invI * (index === 0 ? this.normalJwa0 : this.normalJwa1) * lambda;

        const bodyBImpulseScale = this.bodyB.invMass * lambda;
        this.bodyB.velocity.x += this.normalJvbX * bodyBImpulseScale;
        this.bodyB.velocity.y += this.normalJvbY * bodyBImpulseScale;
        this.bodyB.angularVelocity += this.bodyB.invI * (index === 0 ? this.normalJwb0 : this.normalJwb1) * lambda;
    }

    private applyBlockImpulse(lambdaX: number, lambdaY: number): void {
        if (lambdaX === 0.0 && lambdaY === 0.0) {
            return;
        }

        const linearImpulse = lambdaX + lambdaY;

        const bodyAImpulseScale = this.bodyA.invMass * linearImpulse;
        this.bodyA.velocity.x += this.normalJvaX * bodyAImpulseScale;
        this.bodyA.velocity.y += this.normalJvaY * bodyAImpulseScale;
        this.bodyA.angularVelocity += this.bodyA.invI * (this.normalJwa0 * lambdaX + this.normalJwa1 * lambdaY);

        const bodyBImpulseScale = this.bodyB.invMass * linearImpulse;
        this.bodyB.velocity.x += this.normalJvbX * bodyBImpulseScale;
        this.bodyB.velocity.y += this.normalJvbY * bodyBImpulseScale;
        this.bodyB.angularVelocity += this.bodyB.invI * (this.normalJwb0 * lambdaX + this.normalJwb1 * lambdaY);
    }

    private applyTangentImpulse(index: number, lambda: number): void {
        if (lambda === 0.0) {
            return;
        }

        const bodyAImpulseScale = this.bodyA.invMass * lambda;
        this.bodyA.velocity.x += this.tangentJvaX * bodyAImpulseScale;
        this.bodyA.velocity.y += this.tangentJvaY * bodyAImpulseScale;
        this.bodyA.angularVelocity += this.bodyA.invI * (index === 0 ? this.tangentJwa0 : this.tangentJwa1) * lambda;

        const bodyBImpulseScale = this.bodyB.invMass * lambda;
        this.bodyB.velocity.x += this.tangentJvbX * bodyBImpulseScale;
        this.bodyB.velocity.y += this.tangentJvbY * bodyBImpulseScale;
        this.bodyB.angularVelocity += this.bodyB.invI * (index === 0 ? this.tangentJwb0 : this.tangentJwb1) * lambda;
    }

    private matchesContact(
        contactPointX: number,
        contactPointY: number,
        contactPointId: number,
        oldContactPointX: number,
        oldContactPointY: number,
        oldContactPointId: number,
    ): boolean {
        if (contactPointId !== oldContactPointId) {
            return false;
        }

        if (!SETTINGS.applyWarmStartingThreshold) {
            return true;
        }

        const dx = contactPointX - oldContactPointX;
        const dy = contactPointY - oldContactPointY;

        // If contact points are close enough, warm start.
        // Otherwise, it means it's penetrating too deeply, skip the warm starting to prevent the overshoot
        return dx * dx + dy * dy < SETTINGS.warmStartingThreshold;
    }

    private copyWarmStartImpulse(index: number, oldManifold: ContactManifold, oldIndex: number): void {
        if (index === 0) {
            if (oldIndex === 0) {
                this.normalImpulseSum0 = oldManifold.normalImpulseSum0;
                this.tangentImpulseSum0 = oldManifold.tangentImpulseSum0;
            } else {
                this.normalImpulseSum0 = oldManifold.normalImpulseSum1;
                this.tangentImpulseSum0 = oldManifold.tangentImpulseSum1;
            }
        } else if (oldIndex === 0) {
            this.normalImpulseSum1 = oldManifold.normalImpulseSum0;
            this.tangentImpulseSum1 = oldManifold.tangentImpulseSum0;
        } else {
            this.normalImpulseSum1 = oldManifold.normalImpulseSum1;
            this.tangentImpulseSum1 = oldManifold.tangentImpulseSum1;
        }

        this.persistent = true;
    }

    get points() {
        if (this.contactCount === 1) {
            return [
                {
                    point: new Vec2(this.contactPoint0X, this.contactPoint0Y),
                    id: this.contactPoint0Id,
                },
            ];
        }

        return [
            {
                point: new Vec2(this.contactPoint0X, this.contactPoint0Y),
                id: this.contactPoint0Id,
            },
            {
                point: new Vec2(this.contactPoint1X, this.contactPoint1Y),
                id: this.contactPoint1Id,
            },
        ];
    }

    get normal() {
        return new Vec2(this.contactNormalX, this.contactNormalY);
    }

    get numContacts() {
        return this.contactCount;
    }

    get contactInfo() {
        // Return relevant info
        return {
            bodyA: this.bodyA,
            bodyB: this.bodyB,
            impulseSum: this.normalImpulseSum0 + this.normalImpulseSum1,
        };
    }
}
