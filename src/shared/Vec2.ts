export class Vec2 {
    x: number;
    y: number;

    constructor(x = 0.0, y = 0.0) {
        this.x = x;
        this.y = y;
    }

    copy() {
        return new Vec2(this.x, this.y);
    }

    /** operator += */
    addAssign(v: Vec2): this {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /** operator *= */
    scaleAssign(n: number): this {
        this.x *= n;
        this.y *= n;
        return this;
    }

    /** operator + */
    addNew(v: Vec2): Vec2 {
        const result = new Vec2();
        result.x = this.x + v.x;
        result.y = this.y + v.y;
        return result;
    }

    /** operator - */
    subNew(v: Vec2): Vec2 {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    /** operator * (scalar) */
    scaleNew(n: number): Vec2 {
        const result = new Vec2();
        result.x = this.x * n;
        result.y = this.y * n;
        return result;
    }

    perpNew(): Vec2 {
        return new Vec2(-this.y, this.x);
    }

    unitVector(): Vec2 {
        const result = new Vec2(0, 0);
        const length = this.magnitude();
        if (length !== 0.0) {
            result.x = this.x / length;
            result.y = this.y / length;
        }
        return result;
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}
