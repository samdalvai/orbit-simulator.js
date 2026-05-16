export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0.0, y = 0.0, z = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    copy() {
        return new Vec3(this.x, this.y, this.z);
    }

    /** operator += */
    addAssign(v: Vec3): this {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /** operator *= */
    scaleAssign(n: number): this {
        this.x *= n;
        this.y *= n;
        this.z *= n;
        return this;
    }

    /** operator + */
    addNew(v: Vec3): Vec3 {
        const result = new Vec3();
        result.x = this.x + v.x;
        result.y = this.y + v.y;
        result.z = this.z + v.z;
        return result;
    }

    /** operator - */
    subNew(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z -v.z);
    }

    /** operator * (scalar) */
    scaleNew(n: number): Vec3 {
        const result = new Vec3();
        result.x = this.x * n;
        result.y = this.y * n;
        result.z = this.z * n;
        return result;
    }

    // TODO: there is no unique perp vector in 3d
    perpNew(): Vec3 {
        return new Vec3(-this.y, this.x);
    }

    unitVector(): Vec3 {
        const result = new Vec3(0, 0, 0);
        const length = this.magnitude();
        if (length !== 0.0) {
            result.x = this.x / length;
            result.y = this.y / length;
            result.z = this.z / length;
        }
        return result;
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
}
