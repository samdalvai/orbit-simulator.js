/*
 * Portions of this file are derived from the Sopiro Physics Engine.
 *
 * Copyright (c) 2022 Sopiro
 * Licensed under the MIT License
 *
 * Original project:
 * https://github.com/Sopiro
 */
import { Constraint } from '../constraint/Constraint';
import { SETTINGS } from '../core/Constants';
import { RigidBody } from '../core/RigidBody';
import * as Utils from '../utils/Utils';

export abstract class Joint extends Constraint {
    private static nextId = 0;
    readonly id: number;

    protected beta = 0.0; // Coefficient of position correction (Positional error feedback factor)
    protected gamma = 0.0; // Coefficient of Softness (Force feedback factor)

    public drawAnchor = false;
    public drawConnectionLine = false;

    private frequency!: number;
    private dampingRatio!: number;
    private jointMass!: number;

    // 0 < Frequency
    // 0 <= Damping ratio <= 1
    // 0 < Joint mass
    constructor(bodyA: RigidBody, bodyB: RigidBody, frequency = 15, dampingRatio = 1.0, jointMass = -1) {
        super(bodyA, bodyB);
        this.id = Joint.nextId++;

        this.setFDM(frequency, dampingRatio, jointMass);
    }

    private setFDM(
        frequency: number = this.frequency,
        dampingRatio: number = this.dampingRatio,
        jointMass: number = this.jointMass,
    ): void {
        if (frequency > 0) {
            this.frequency = frequency;
            this.dampingRatio = Utils.clamp(dampingRatio, 0.0, 1.0);

            Utils.assert(this.bodyA.mass > 0 || this.bodyB.mass > 0);
            this.jointMass = jointMass <= 0 ? (this.bodyA.mass > 0 ? this.bodyA.mass : this.bodyB.mass) : jointMass;

            this.calculateBetaAndGamma();
        } else {
            // If the frequency is less than or equal to zero, make this joint solid
            this.frequency = -1;
            this.dampingRatio = 1.0;
            this.jointMass = -1;

            this.beta = 1.0;
            this.gamma = 0.0;
        }
    }

    private calculateBetaAndGamma() {
        const omega = 2 * Math.PI * this.frequency;
        const d = 2 * this.jointMass * this.dampingRatio * omega; // Damping coefficient
        const k = this.jointMass * omega * omega; // Spring constant
        const h = SETTINGS.dt;

        this.beta = (h * k) / (d + h * k);
        this.gamma = 1.0 / ((d + h * k) * h);
    }
}
