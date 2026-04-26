export class Vec2 {
    x: number;
    y: number;

    constructor(x = 0.0, y = 0.0) {
        this.x = x;
        this.y = y;
    }

    copy(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    /** operator = */
    assign(v: Vec2): this {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    /** operator == */
    equals(v: Vec2): boolean {
        return this.x === v.x && this.y === v.y;
    }

    /** operator != */
    notEquals(v: Vec2): boolean {
        return !this.equals(v);
    }

    add(v: Vec2): void {
        this.x += v.x;
        this.y += v.y;
    }

    sub(v: Vec2): void {
        this.x -= v.x;
        this.y -= v.y;
    }

    scale(n: number): void {
        this.x *= n;
        this.y *= n;
    }

    normalize(): this {
        const length = this.magnitude();
        if (length !== 0.0) {
            this.x /= length;
            this.y /= length;
        }
        return this;
    }

    /** operator += */
    addAssign(v: Vec2): this {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /** operator -= */
    subAssign(v: Vec2): this {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /** operator *= */
    scaleAssign(n: number): this {
        this.x *= n;
        this.y *= n;
        return this;
    }

    /** operator /= */
    divAssign(n: number): this {
        this.x /= n;
        this.y /= n;
        return this;
    }

    /** operator - (unary negation) */
    negate(): void {
        this.x *= -1;
        this.y *= -1;
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

    /** operator / (scalar) */
    divNew(n: number): Vec2 {
        const result = new Vec2();
        result.x = this.x / n;
        result.y = this.y / n;
        return result;
    }

    /** operator - (unary negation) */
    negateNew(): Vec2 {
        const result = new Vec2();
        result.x = -this.x;
        result.y = -this.y;
        return result;
    }

    rotate(angle: number): Vec2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }

    lerp(v: Vec2, t: number): Vec2 {
        return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
    }

    leftPerpNew(): Vec2 {
        return new Vec2(-this.y, this.x);
    }

    perpNew(): Vec2 {
        return this.leftPerpNew();
    }

    normal(): Vec2 {
        return new Vec2(this.y, -this.x).normalize();
    }

    normalizeNew(): Vec2 {
        const length = this.magnitude();
        if (length !== 0.0) {
            return this.divNew(length);
        }
        return this;
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

    /** Vector in the -90° (clockwise) perpendicular direction scaled by n */
    crossScalar(n: number): Vec2 {
        return new Vec2(-n * this.y, n * this.x);
    }

    dot(v: Vec2): number {
        return this.x * v.x + this.y * v.y;
    }

    cross(v: Vec2): number {
        return this.x * v.y - this.y * v.x;
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magnitudeSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    distanceSquared(v: Vec2): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }
}
