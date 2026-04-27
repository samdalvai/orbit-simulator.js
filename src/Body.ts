import * as Utils from './Utils';
import { Vec2 } from './Vec2';

export enum BodyType {
    STAR,
    PLANET,
    MOON,
    ASTEROID,
}
export class Body {
    private static nextId = 0;
    readonly id: number;

    parent: Body | null = null;
    bodyType: BodyType;

    radius: number; // km

    // Linear motion
    position: Vec2;
    velocity: Vec2;
    private _acceleration: Vec2;

    // Forces
    private _sumForces: Vec2;

    // Mass and Moment of Inertia
    private _mass: number; // kg
    private _invMass: number;
    private _I: number;
    private _invI: number;

    // AABB for collision
    minX = 0;
    maxX = 0;
    minY = 0;
    maxY = 0;

    constructor(x: number, y: number, radius: number, mass: number, bodyType: BodyType) {
        Utils.assert(mass > 0, 'Mass needs to be greater than 0');

        this.id = Body.nextId++;
        this.bodyType = bodyType;

        this.radius = radius;

        this.position = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        this._acceleration = new Vec2(0, 0);

        this._sumForces = new Vec2(0, 0);

        this._mass = mass;
        this._invMass = 1 / mass;

        // Moment of inertia of circle
        this._I = 0.5 * this.radius * this.radius * mass;
        this._invI = 1 / this._I;

        this.updateAABB();
    }

    get mass(): number {
        return this._mass;
    }

    set mass(value: number) {
        Utils.assert(value >= 0);
        this._mass = value;
    }

    get invMass(): number {
        return this._invMass;
    }

    get I(): number {
        return this._I;
    }

    get invI(): number {
        return this._invI;
    }

    addForce(force: Vec2): void {
        this._sumForces.addAssign(force);
    }

    clearForces(): void {
        this._sumForces.x = 0.0;
        this._sumForces.y = 0.0;
    }

    applyImpulseLinear(j: Vec2): void {
        this.velocity.x += j.x * this.invMass;
        this.velocity.y += j.y * this.invMass;
    }

    initializeAccelleration(): void {
        // Find the acceleration based on the forces that are being applied and the mass
        this._acceleration.x = this._sumForces.x * this.invMass;
        this._acceleration.y = this._sumForces.y * this.invMass;

        // Clear all the forces and torque acting on the object before the next physics step
        this.clearForces();
    }

    integrateVerletPosition(dt: number): void {
        const ax = this._acceleration.x;
        const ay = this._acceleration.y;

        this.position.x += this.velocity.x * dt + 0.5 * ax * dt * dt;
        this.position.y += this.velocity.y * dt + 0.5 * ay * dt * dt;

        // Update AABB values based on new position
        this.updateAABB();
    }

    integrateVerletVelocity(dt: number): void {
        const oldAx = this._acceleration.x;
        const oldAy = this._acceleration.y;

        const newAx = this._sumForces.x * this.invMass;
        const newAy = this._sumForces.y * this.invMass;

        this.velocity.x += 0.5 * (oldAx + newAx) * dt;
        this.velocity.y += 0.5 * (oldAy + newAy) * dt;

        // store for next step
        this._acceleration.x = newAx;
        this._acceleration.y = newAy;

        this.clearForces();
    }

    updateAABB() {
        const radius = this.radius;
        this.minX = this.position.x - radius;
        this.maxX = this.position.x + radius;
        this.minY = this.position.y - radius;
        this.maxY = this.position.y + radius;
    }
}
