/*
 * Portions of this file are derived from the Sopiro Physics Engine.
 *
 * Copyright (c) 2022 Sopiro
 * Licensed under the MIT License
 *
 * Original project:
 * https://github.com/Sopiro
 */
import { SETTINGS } from '../core/Constants';
import { RigidBody } from '../core/RigidBody';
import { Vec2 } from '../math/Vec2';
import { Joint } from './Joint';

export class WeldJoint extends Joint {
    public localAnchorA!: Vec2;
    public localAnchorB!: Vec2;
    public initialAngleOffset: number;

    private raX = 0.0;
    private raY = 0.0;
    private rbX = 0.0;
    private rbY = 0.0;

    private effectiveMass00 = 0.0;
    private effectiveMass01 = 0.0;
    private effectiveMass02 = 0.0;
    private effectiveMass10 = 0.0;
    private effectiveMass11 = 0.0;
    private effectiveMass12 = 0.0;
    private effectiveMass20 = 0.0;
    private effectiveMass21 = 0.0;
    private effectiveMass22 = 0.0;

    private biasX = 0.0;
    private biasY = 0.0;
    private biasZ = 0.0;
    private impulseSumX = 0.0;
    private impulseSumY = 0.0;
    private impulseSumZ = 0.0;

    constructor(
        bodyA: RigidBody,
        bodyB: RigidBody,
        anchor: Vec2 = bodyA.position.lerp(bodyB.position, 0.5),
        frequency = -1,
        dampingRatio = 1.0,
        jointMass = -1,
    ) {
        super(bodyA, bodyB, frequency, dampingRatio, jointMass);

        this.initialAngleOffset = bodyB.rotation - bodyA.rotation;
        this.localAnchorA = this.bodyA.worldPointToLocal(anchor);
        this.localAnchorB = this.bodyB.worldPointToLocal(anchor);

        this.drawAnchor = false;
        this.drawConnectionLine = false;
    }

    override preSolve(invDt: number): void {
        const bodyA = this.bodyA;
        const bodyB = this.bodyB;

        const localAnchorA = this.localAnchorA;
        const cosA = Math.cos(bodyA.rotation);
        const sinA = Math.sin(bodyA.rotation);
        this.raX = localAnchorA.x * cosA - localAnchorA.y * sinA;
        this.raY = localAnchorA.x * sinA + localAnchorA.y * cosA;

        const localAnchorB = this.localAnchorB;
        const cosB = Math.cos(bodyB.rotation);
        const sinB = Math.sin(bodyB.rotation);
        this.rbX = localAnchorB.x * cosB - localAnchorB.y * sinB;
        this.rbY = localAnchorB.x * sinB + localAnchorB.y * cosB;

        const invMassA = bodyA.invMass;
        const invMassB = bodyB.invMass;
        const invIA = bodyA.invI;
        const invIB = bodyB.invI;

        const k00 = invMassA + invMassB + invIA * this.raY * this.raY + invIB * this.rbY * this.rbY + this.gamma;
        const k01 = -invIA * this.raY * this.raX - invIB * this.rbY * this.rbX;
        const k02 = -invIA * this.raY - invIB * this.rbY;
        const k11 = invMassA + invMassB + invIA * this.raX * this.raX + invIB * this.rbX * this.rbX + this.gamma;
        const k12 = invIA * this.raX + invIB * this.rbX;
        const k22 = invIA + invIB + this.gamma;

        const det = k00 * (k11 * k22 - k12 * k12) - k01 * (k01 * k22 - k12 * k02) + k02 * (k01 * k12 - k11 * k02);

        if (det === 0.0) {
            throw new Error('Determinant 0');
        }

        const invDet = 1.0 / det;
        this.effectiveMass00 = (k11 * k22 - k12 * k12) * invDet;
        this.effectiveMass01 = (k02 * k12 - k01 * k22) * invDet;
        this.effectiveMass02 = (k01 * k12 - k02 * k11) * invDet;
        this.effectiveMass10 = (k12 * k02 - k01 * k22) * invDet;
        this.effectiveMass11 = (k00 * k22 - k02 * k02) * invDet;
        this.effectiveMass12 = (k01 * k02 - k00 * k12) * invDet;
        this.effectiveMass20 = (k01 * k12 - k02 * k11) * invDet;
        this.effectiveMass21 = (k02 * k01 - k00 * k12) * invDet;
        this.effectiveMass22 = (k00 * k11 - k01 * k01) * invDet;

        const errorX = bodyB.position.x + this.rbX - (bodyA.position.x + this.raX);
        const errorY = bodyB.position.y + this.rbY - (bodyA.position.y + this.raY);
        const errorZ = bodyB.rotation - bodyA.rotation - this.initialAngleOffset;

        if (SETTINGS.positionCorrection) {
            const biasScale = this.beta * invDt;
            this.biasX = errorX * biasScale;
            this.biasY = errorY * biasScale;
            this.biasZ = errorZ * biasScale;
        } else {
            this.biasX = 0.0;
            this.biasY = 0.0;
            this.biasZ = 0.0;
        }

        if (
            SETTINGS.warmStarting &&
            (this.impulseSumX !== 0.0 || this.impulseSumY !== 0.0 || this.impulseSumZ !== 0.0)
        ) {
            this.applyImpulse(this.impulseSumX, this.impulseSumY, this.impulseSumZ);
        }
    }

    override solve(): void {
        const bodyA = this.bodyA;
        const bodyB = this.bodyB;

        const relativeVelocityX =
            bodyB.velocity.x - bodyB.angularVelocity * this.rbY - (bodyA.velocity.x - bodyA.angularVelocity * this.raY);
        const relativeVelocityY =
            bodyB.velocity.y + bodyB.angularVelocity * this.rbX - (bodyA.velocity.y + bodyA.angularVelocity * this.raX);
        const relativeAngularVelocity = bodyB.angularVelocity - bodyA.angularVelocity;

        const rhsX = -(relativeVelocityX + this.biasX + this.impulseSumX * this.gamma);
        const rhsY = -(relativeVelocityY + this.biasY + this.impulseSumY * this.gamma);
        const rhsZ = -(relativeAngularVelocity + this.biasZ + this.impulseSumZ * this.gamma);

        const lambdaX = this.effectiveMass00 * rhsX + this.effectiveMass01 * rhsY + this.effectiveMass02 * rhsZ;
        const lambdaY = this.effectiveMass10 * rhsX + this.effectiveMass11 * rhsY + this.effectiveMass12 * rhsZ;
        const lambdaZ = this.effectiveMass20 * rhsX + this.effectiveMass21 * rhsY + this.effectiveMass22 * rhsZ;

        this.applyImpulse(lambdaX, lambdaY, lambdaZ);

        if (SETTINGS.warmStarting) {
            this.impulseSumX += lambdaX;
            this.impulseSumY += lambdaY;
            this.impulseSumZ += lambdaZ;
        }
    }

    private applyImpulse(lambdaX: number, lambdaY: number, lambdaZ: number): void {
        if (lambdaX === 0.0 && lambdaY === 0.0 && lambdaZ === 0.0) {
            return;
        }

        const bodyA = this.bodyA;
        const bodyB = this.bodyB;

        const bodyAImpulseScale = bodyA.invMass;
        bodyA.velocity.x -= lambdaX * bodyAImpulseScale;
        bodyA.velocity.y -= lambdaY * bodyAImpulseScale;
        bodyA.angularVelocity -= (this.raX * lambdaY - this.raY * lambdaX + lambdaZ) * bodyA.invI;

        const bodyBImpulseScale = bodyB.invMass;
        bodyB.velocity.x += lambdaX * bodyBImpulseScale;
        bodyB.velocity.y += lambdaY * bodyBImpulseScale;
        bodyB.angularVelocity += (this.rbX * lambdaY - this.rbY * lambdaX + lambdaZ) * bodyB.invI;
    }
}
