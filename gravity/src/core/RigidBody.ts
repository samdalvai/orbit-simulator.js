import { CollisionCategory } from '../collision/CollisionFilter';
import { ContactInfo } from '../collision/ContactManifold';
import { Vec2 } from '../math/Vec2';
import { CircleShape } from '../shapes/CircleShape';
import { Shape, ShapeType } from '../shapes/Shape';
import * as Utils from '../utils/Utils';
import { SETTINGS } from './Constants';

export class RigidBody {
    private static nextId = 0;
    readonly id: number;

    // Linear motion
    position: Vec2;
    velocity: Vec2;
    private _acceleration: Vec2;

    // Angular motion
    rotation: number;
    angularVelocity: number;
    angularAcceleration: number;
    canRotate: boolean;

    // Forces and torque
    private _sumForces: Vec2;
    private _sumTorque: number;

    // Mass and Moment of Inertia
    private _mass: number;
    private _invMass: number;
    private _I: number;
    private _invI: number;

    // Material properties
    private _restitution: number;
    private _friction: number;
    private _density: number;
    private _rollingResistance: number;

    // Special material properties
    charge: number;
    surfaceSpeed: number;
    temperature: number;
    gravityScale: number;

    // Grounded variables
    isGrounded = false;
    lastGroundedTime = 0;

    // Continuous collision detection
    private _isBullet = false;

    // Pointer to the shape/geometry of this rigid body
    readonly shape: Shape;
    readonly shapeType: ShapeType;

    // Collision filters
    collisionCategory: CollisionCategory;
    collisionMask: CollisionCategory;

    // AABB
    minX = 0;
    maxX = 0;
    minY = 0;
    maxY = 0;

    public onContact?: (contactInfo: ContactInfo) => void;

    constructor(shape: Shape, x: number, y: number, mass?: number, density?: number) {
        Utils.assert(mass !== undefined || density !== undefined, 'One between mass or density should be defined');

        this.id = RigidBody.nextId++;

        this.shape = shape;
        this.shapeType = shape.getType();

        Utils.assert(
            this.shapeType !== ShapeType.SEGMENT || mass === 0 || density === 0,
            'Segments can only be static',
        );

        this.position = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        this._acceleration = new Vec2(0, 0);

        this.rotation = 0.0;
        this.angularVelocity = 0.0;
        this.angularAcceleration = 0.0;
        this.canRotate = true;

        this._sumForces = new Vec2(0, 0);
        this._sumTorque = 0.0;

        this._density = 0;
        this._mass = 0;
        this._invMass = 0.0;
        this._I = 0.0;
        this._invI = 0.0;

        if (mass !== undefined) {
            this._mass = mass;
            this.updateDensityProperties();
        }

        if (density !== undefined) {
            this._density = density;
            this.updateMassProperties();
        }

        this._restitution = 0.2;
        this._friction = 0.7;
        this._rollingResistance = 0.5;

        this.charge = 0;
        this.surfaceSpeed = 0;
        this.temperature = 0;
        this.gravityScale = 1;

        this.collisionCategory = CollisionCategory.DEFAULT;
        this.collisionMask = CollisionCategory.ALL;

        this.shape.updateVertices(this.rotation, this.position);
        this.shape.updateAABB(this);
    }

    get mass(): number {
        return this._mass;
    }

    set mass(value: number) {
        Utils.assert(value >= 0);
        this._mass = value;

        this.updateDensityProperties();
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

    get restitution(): number {
        return this._restitution;
    }

    set restitution(value: number) {
        Utils.assert(value >= 0 && value <= 1);
        this._restitution = value;
    }

    get friction(): number {
        return this._friction;
    }

    set friction(value: number) {
        Utils.assert(value >= 0 && value <= 1);
        this._friction = value;
    }

    get density(): number {
        return this._density;
    }

    set density(value: number) {
        Utils.assert(value >= 0);
        this._density = value;

        this.updateMassProperties();
    }

    get rollingResistance(): number {
        return this._rollingResistance;
    }

    set rollingResistance(value: number) {
        Utils.assert(value >= 0);
        this._rollingResistance = value;
    }

    get isBullet(): boolean {
        return this._isBullet;
    }

    /** Set this to true if you want to run CCD for this object, use splaringly because
     *  CCD is expensive
     */
    set isBullet(value: boolean) {
        if (value) {
            Utils.assert(this.shapeType === ShapeType.CIRCLE);
            Utils.assert(this.shape instanceof CircleShape);
        }

        this._isBullet = value;
    }

    private updateMassProperties(): void {
        Utils.assert(this._density >= 0, 'Density must be non-negative');
        Utils.assert(this.shapeType !== ShapeType.SEGMENT || this._density === 0, 'Segments can only be static');

        const area = this.shape.getArea();
        this._mass = area * this._density;
        this.syncMassProperties();
    }

    private updateDensityProperties(): void {
        Utils.assert(this._mass >= 0, 'Mass must be non-negative');
        Utils.assert(this.shapeType !== ShapeType.SEGMENT || this._mass === 0, 'Segments can only be static');

        const area = this.shape.getArea();
        this._density = this._mass / area;
        this.syncMassProperties();
    }

    private syncMassProperties(): void {
        this._invMass = this.mass !== 0.0 ? 1.0 / this.mass : 0.0;
        this._I = this.shape.getMomentOfInertia() * this.mass;
        this._invI = this.I !== 0.0 ? 1.0 / this.I : 0.0;
    }

    isStatic(): boolean {
        return this.invMass === 0;
    }

    addForce(force: Vec2): void {
        this._sumForces.addAssign(force);
    }

    addForceY(value: number) {
        this._sumForces.y += value;
    }

    addTorque(torque: number): void {
        this._sumTorque += torque;
    }

    addForceAtPoint(force: Vec2, worldPoint: Vec2): void {
        this.addForce(force);

        const r = worldPoint.subNew(this.position);
        this.addTorque(r.cross(force));
    }

    clearForces(): void {
        this._sumForces.x = 0.0;
        this._sumForces.y = 0.0;
    }

    clearTorque(): void {
        this._sumTorque = 0.0;
    }

    localPointToWorld(point: Vec2): Vec2 {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        const rotated = new Vec2(
            point.x * cos - point.y * sin + this.position.x,
            point.x * sin + point.y * cos + this.position.y,
        );

        return rotated;
    }

    worldPointToLocal(point: Vec2): Vec2 {
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);

        const translatedX = point.x - this.position.x;
        const translatedY = point.y - this.position.y;
        const rotatedX = cos * translatedX - sin * translatedY;
        const rotatedY = cos * translatedY + sin * translatedX;

        return new Vec2(rotatedX, rotatedY);
    }

    worldDirToLocal(dir: Vec2): Vec2 {
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);

        return new Vec2(cos * dir.x - sin * dir.y, sin * dir.x + cos * dir.y);
    }

    applyImpulseLinear(j: Vec2): void {
        if (this.isStatic()) {
            return;
        }

        this.velocity.x += j.x * this.invMass;
        this.velocity.y += j.y * this.invMass;
    }

    applyImpulseAngular(j: number): void {
        if (this.isStatic()) {
            return;
        }

        this.angularVelocity += j * this.invI;
    }

    applyImpulseAtPoint(j: Vec2, r: Vec2): void {
        if (this.isStatic()) {
            return;
        }
        this.velocity.addAssign(j.scaleNew(this.invMass));
        this.angularVelocity += r.cross(j) * this.invI;
    }

    integrateForces(dt: number): void {
        if (this.isStatic()) {
            return;
        }

        // Find the acceleration based on the forces that are being applied and the mass
        this._acceleration.x = this._sumForces.x * this.invMass;
        this._acceleration.y = this._sumForces.y * this.invMass;

        // Integrate the acceleration to find the new velocity
        this.velocity.x += this._acceleration.x * dt;
        this.velocity.y += this._acceleration.y * dt;

        // Find the angular acceleration based on the torque that is being applied and the moment of inertia
        this.angularAcceleration = this._sumTorque * this.invI;

        // Integrate the angular acceleration to find the new angular velocity
        this.angularVelocity += this.angularAcceleration * dt;

        // Clear all the forces and torque acting on the object before the next physics step
        this.clearForces();
        this.clearTorque();
    }

    integrateVelocities(dt: number): void {
        if (this.isStatic()) {
            return;
        }

        // Integrate the velocity to find the new position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // Integrate the angular velocity to find the new rotation angle
        if (this.canRotate) {
            this.rotation += this.angularVelocity * dt;

            // Clamp tiny angular velocity to avoid circles accumulating angular velocity
            if (Math.abs(this.angularVelocity) < SETTINGS.angularVelocitySlop) {
                this.angularVelocity = 0;
            }
        } else {
            this.angularVelocity = 0;
        }

        // Update the vertices to adjust them to the new position/rotation
        this.shape.updateVertices(this.rotation, this.position);

        // Update AABB values based on new position
        this.shape.updateAABB(this);

        // Apply rolling resistance for grounded bodies
        if (this.isGrounded) {
            this.angularVelocity *= 1 - this._rollingResistance * dt;
        }
    }

    isPointInside(point: Vec2): boolean {
        return this.shape.isPointInside(this, point);
    }
}
