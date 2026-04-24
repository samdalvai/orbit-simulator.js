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

export class GrabJoint extends Joint {
    public localAnchor: Vec2;
    public target: Vec2;

    private rX = 0.0;
    private rY = 0.0;

    private effectiveMass00 = 0.0;
    private effectiveMass01 = 0.0;
    private effectiveMass10 = 0.0;
    private effectiveMass11 = 0.0;

    private biasX = 0.0;
    private biasY = 0.0;
    private impulseSumX = 0.0;
    private impulseSumY = 0.0;

    constructor(body: RigidBody, anchor: Vec2, target: Vec2, frequency = 0.8, dampingRatio = 0.6, jointMass = -1) {
        super(body, body, frequency, dampingRatio, jointMass);

        this.localAnchor = this.bodyA.worldPointToLocal(anchor);
        this.target = target.copy();
    }

    setTarget(target: Vec2): void {
        this.target.assign(target);
    }

    override preSolve(invDt: number): void {
        const bodyA = this.bodyA;
        const localAnchor = this.localAnchor;
        const cos = Math.cos(bodyA.rotation);
        const sin = Math.sin(bodyA.rotation);
        this.rX = localAnchor.x * cos - localAnchor.y * sin;
        this.rY = localAnchor.x * sin + localAnchor.y * cos;

        const invMass = bodyA.invMass;
        const invI = bodyA.invI;
        const k00 = invMass + invI * this.rY * this.rY + this.gamma;
        const k01 = -invI * this.rY * this.rX;
        const k10 = -invI * this.rX * this.rY;
        const k11 = invMass + invI * this.rX * this.rX + this.gamma;
        const det = k00 * k11 - k01 * k10;

        if (det === 0.0) {
            throw new Error('Determinant 0');
        }

        const invDet = 1.0 / det;
        this.effectiveMass00 = k11 * invDet;
        this.effectiveMass01 = -k01 * invDet;
        this.effectiveMass10 = -k10 * invDet;
        this.effectiveMass11 = k00 * invDet;

        const errorX = bodyA.position.x + this.rX - this.target.x;
        const errorY = bodyA.position.y + this.rY - this.target.y;

        if (SETTINGS.positionCorrection && invDt > 0) {
            const biasScale = this.beta * invDt;
            this.biasX = errorX * biasScale;
            this.biasY = errorY * biasScale;
        } else {
            this.biasX = 0.0;
            this.biasY = 0.0;
        }

        if (SETTINGS.warmStarting && (this.impulseSumX !== 0.0 || this.impulseSumY !== 0.0)) {
            this.applyImpulse(this.impulseSumX, this.impulseSumY);
        }
    }

    override solve(): void {
        const bodyA = this.bodyA;
        const jvX = bodyA.velocity.x - bodyA.angularVelocity * this.rY;
        const jvY = bodyA.velocity.y + bodyA.angularVelocity * this.rX;

        const rhsX = -(jvX + this.biasX + this.impulseSumX * this.gamma);
        const rhsY = -(jvY + this.biasY + this.impulseSumY * this.gamma);

        const lambdaX = this.effectiveMass00 * rhsX + this.effectiveMass01 * rhsY;
        const lambdaY = this.effectiveMass10 * rhsX + this.effectiveMass11 * rhsY;

        this.applyImpulse(lambdaX, lambdaY);

        if (SETTINGS.warmStarting) {
            this.impulseSumX += lambdaX;
            this.impulseSumY += lambdaY;
        }
    }

    private applyImpulse(lambdaX: number, lambdaY: number): void {
        if (lambdaX === 0.0 && lambdaY === 0.0) {
            return;
        }

        const bodyA = this.bodyA;
        bodyA.velocity.x += lambdaX * bodyA.invMass;
        bodyA.velocity.y += lambdaY * bodyA.invMass;
        bodyA.angularVelocity += (this.rX * lambdaY - this.rY * lambdaX) * bodyA.invI;
    }
}
