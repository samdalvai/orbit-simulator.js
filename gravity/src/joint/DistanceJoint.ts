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

export class DistanceJoint extends Joint {
    public localAnchorA!: Vec2;
    public localAnchorB!: Vec2;
    private readonly length: number;

    private raX = 0.0;
    private raY = 0.0;
    private rbX = 0.0;
    private rbY = 0.0;
    private nX = 0.0;
    private nY = 0.0;
    private sA = 0.0;
    private sB = 0.0;
    private effectiveMass = 0.0;
    private bias = 0.0;
    private impulseSum: number = 0.0;

    constructor(
        bodyA: RigidBody,
        bodyB: RigidBody,
        anchorA: Vec2 = bodyA.position,
        anchorB: Vec2 = bodyB.position,
        length: number = -1,
        frequency = 15,
        dampingRatio = 1.0,
        jointMass = -1,
    ) {
        super(bodyA, bodyB, frequency, dampingRatio, jointMass);

        this.localAnchorA = this.bodyA.worldPointToLocal(anchorA);
        this.localAnchorB = this.bodyB.worldPointToLocal(anchorB);
        this.length = length <= 0 ? anchorB.subNew(anchorA).magnitude() : length;
    }

    override preSolve(invDt: number): void {
        // Calculate Jacobian J and effective mass M
        const bodyA = this.bodyA;
        const bodyB = this.bodyB;
        const bodyAPosition = bodyA.position;
        const bodyBPosition = bodyB.position;

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

        const uX = bodyBPosition.x + this.rbX - (bodyAPosition.x + this.raX);
        const uY = bodyBPosition.y + this.rbY - (bodyAPosition.y + this.raY);
        const length = Math.sqrt(uX * uX + uY * uY);

        if (length > 0.0) {
            this.nX = uX / length;
            this.nY = uY / length;
        } else {
            this.nX = 0.0;
            this.nY = 0.0;
        }

        this.sA = this.nX * this.raY - this.nY * this.raX;
        this.sB = this.nX * this.rbY - this.nY * this.rbX;

        const k =
            this.bodyA.invMass +
            this.bodyB.invMass +
            this.bodyA.invI * this.sA * this.sA +
            this.bodyB.invI * this.sB * this.sB +
            this.gamma;

        this.effectiveMass = 1.0 / k;

        const error = length - this.length;

        // We skip positional correction for 0 inverse delta time because CCD can generate 0 dt
        if (SETTINGS.positionCorrection && invDt > 0) {
            this.bias = error * this.beta * invDt;
        } else {
            this.bias = 0.0;
        }

        if (SETTINGS.warmStarting && this.impulseSum !== 0.0) this.applyImpulse(this.impulseSum);
    }

    override solve(): void {
        // Calculate corrective impulse: Pc
        const bodyAVelocity = this.bodyA.velocity;
        const bodyBVelocity = this.bodyB.velocity;
        const relativeVelocityX =
            bodyBVelocity.x -
            this.bodyB.angularVelocity * this.rbY -
            (bodyAVelocity.x - this.bodyA.angularVelocity * this.raY);
        const relativeVelocityY =
            bodyBVelocity.y +
            this.bodyB.angularVelocity * this.rbX -
            (bodyAVelocity.y + this.bodyA.angularVelocity * this.raX);
        const jv = relativeVelocityX * this.nX + relativeVelocityY * this.nY;

        // Check out below for the reason why the (accumulated impulse * gamma) term is on the right hand side
        // https://pybullet.org/Bullet/phpBB3/viewtopic.php?f=4&t=1354
        const lambda = this.effectiveMass * -(jv + this.bias + this.impulseSum * this.gamma);

        this.applyImpulse(lambda);

        if (SETTINGS.warmStarting) this.impulseSum += lambda;
    }

    private applyImpulse(lambda: number): void {
        if (lambda === 0.0) {
            return;
        }

        const bodyAImpulseScale = lambda * this.bodyA.invMass;
        this.bodyA.velocity.x -= this.nX * bodyAImpulseScale;
        this.bodyA.velocity.y -= this.nY * bodyAImpulseScale;
        // Body A receives the opposite linear impulse, which flips the angular term's sign.
        this.bodyA.angularVelocity += this.sA * lambda * this.bodyA.invI;

        const bodyBImpulseScale = lambda * this.bodyB.invMass;
        this.bodyB.velocity.x += this.nX * bodyBImpulseScale;
        this.bodyB.velocity.y += this.nY * bodyBImpulseScale;
        this.bodyB.angularVelocity -= this.sB * lambda * this.bodyB.invI;
    }
}
