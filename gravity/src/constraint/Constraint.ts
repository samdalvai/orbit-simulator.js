/*
 * Portions of this file are derived from the Sopiro Physics Engine.
 *
 * Copyright (c) 2022 Sopiro
 * Licensed under the MIT License
 *
 * Original project:
 * https://github.com/Sopiro
 */
import { RigidBody } from '../core/RigidBody';

export abstract class Constraint {
    public bodyA: RigidBody;
    public bodyB: RigidBody;

    constructor(bodyA: RigidBody, bodyB: RigidBody) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
    }

    // Calculate Jacobian J and effective mass M
    public abstract preSolve(inverseDeltaTime: number): void;

    // Solve velocity constraint, calculate corrective impulse for current iteration
    public abstract solve(): void;
}
