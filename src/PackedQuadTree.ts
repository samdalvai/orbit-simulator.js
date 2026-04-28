import { Body } from './Body';
import { Vec2 } from './Vec2';

export type PackedQuad = {
    centerX: number;
    centerY: number;
    size: number;
};

export class PackedQuadTree {
    static readonly ROOT = 0;

    thetaSquared: number;
    epsilonSquared: number;

    nodeCount = 0;
    children: Uint32Array;
    next: Uint32Array;
    posX: Float64Array;
    posY: Float64Array;
    mass: Float64Array;
    centerX: Float64Array;
    centerY: Float64Array;
    size: Float64Array;

    private nodeCapacity: number;
    private parentCount = 0;
    private parentCapacity: number;
    private parents: Uint32Array;

    constructor(theta = 0.5, epsilon = 1, initialCapacity = 1024) {
        const nodeCapacity = Math.max(1, Math.floor(initialCapacity));
        const parentCapacity = Math.max(1, Math.floor(nodeCapacity * 0.25));

        this.thetaSquared = theta * theta;
        this.epsilonSquared = epsilon * epsilon;

        this.nodeCapacity = nodeCapacity;
        this.parentCapacity = parentCapacity;

        this.children = new Uint32Array(nodeCapacity);
        this.next = new Uint32Array(nodeCapacity);
        this.posX = new Float64Array(nodeCapacity);
        this.posY = new Float64Array(nodeCapacity);
        this.mass = new Float64Array(nodeCapacity);
        this.centerX = new Float64Array(nodeCapacity);
        this.centerY = new Float64Array(nodeCapacity);
        this.size = new Float64Array(nodeCapacity);
        this.parents = new Uint32Array(parentCapacity);
    }

    static newContaining(bodies: readonly Body[]): PackedQuad | null {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body.mass === 0) continue;

            const x = body.position.x;
            const y = body.position.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        if (minX === Number.POSITIVE_INFINITY) {
            return null;
        }

        return {
            centerX: (minX + maxX) * 0.5,
            centerY: (minY + maxY) * 0.5,
            size: Math.max(maxX - minX, maxY - minY),
        };
    }

    build(bodies: readonly Body[]): boolean {
        const quad = PackedQuadTree.newContaining(bodies);
        if (quad === null) {
            this.nodeCount = 0;
            this.parentCount = 0;
            return false;
        }

        this.ensureNodeCapacity(Math.max(1, bodies.length * 4));
        this.ensureParentCapacity(Math.max(1, bodies.length));
        this.clear(quad);

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            this.insertXYMass(body.position.x, body.position.y, body.mass);
        }

        this.propagate();
        return true;
    }

    clear(quad: PackedQuad): void {
        this.nodeCount = 0;
        this.parentCount = 0;
        this.pushNode(0, quad.centerX, quad.centerY, quad.size);
    }

    insert(pos: Vec2, mass: number): void {
        this.insertXYMass(pos.x, pos.y, mass);
    }

    insertXYMass(x: number, y: number, mass: number): void {
        if (mass === 0) return;

        let node = PackedQuadTree.ROOT;

        while (this.children[node] !== 0) {
            node = this.children[node] + this.findQuadrant(node, x, y);
        }

        if (this.mass[node] === 0) {
            this.posX[node] = x;
            this.posY[node] = y;
            this.mass[node] = mass;
            return;
        }

        const existingX = this.posX[node];
        const existingY = this.posY[node];
        const existingMass = this.mass[node];

        if (x === existingX && y === existingY) {
            this.mass[node] += mass;
            return;
        }

        for (;;) {
            const children = this.subdivide(node);
            const q1 = this.findQuadrant(node, existingX, existingY);
            const q2 = this.findQuadrant(node, x, y);

            if (q1 === q2) {
                node = children + q1;
                continue;
            }

            const n1 = children + q1;
            this.posX[n1] = existingX;
            this.posY[n1] = existingY;
            this.mass[n1] = existingMass;

            const n2 = children + q2;
            this.posX[n2] = x;
            this.posY[n2] = y;
            this.mass[n2] = mass;
            return;
        }
    }

    propagate(): void {
        const children = this.children;
        const posX = this.posX;
        const posY = this.posY;
        const mass = this.mass;

        for (let p = this.parentCount - 1; p >= 0; p--) {
            const node = this.parents[p];
            const firstChild = children[node];

            const i0 = firstChild;
            const i1 = firstChild + 1;
            const i2 = firstChild + 2;
            const i3 = firstChild + 3;

            const m0 = mass[i0];
            const m1 = mass[i1];
            const m2 = mass[i2];
            const m3 = mass[i3];
            const totalMass = m0 + m1 + m2 + m3;

            mass[node] = totalMass;
            posX[node] = (posX[i0] * m0 + posX[i1] * m1 + posX[i2] * m2 + posX[i3] * m3) / totalMass;
            posY[node] = (posY[i0] * m0 + posY[i1] * m1 + posY[i2] * m2 + posY[i3] * m3) / totalMass;
        }
    }

    accelerationAt(x: number, y: number, G: number, out = new Vec2(), thetaSquared = this.thetaSquared): Vec2 {
        out.x = 0;
        out.y = 0;

        if (this.nodeCount === 0) {
            return out;
        }

        const children = this.children;
        const next = this.next;
        const posX = this.posX;
        const posY = this.posY;
        const mass = this.mass;
        const size = this.size;
        const epsilonSquared = this.epsilonSquared;

        let node = PackedQuadTree.ROOT;

        for (;;) {
            const dx = posX[node] - x;
            const dy = posY[node] - y;
            const distanceSquared = dx * dx + dy * dy;

            if (children[node] === 0 || size[node] * size[node] < distanceSquared * thetaSquared) {
                const denominator = (distanceSquared + epsilonSquared) * Math.sqrt(distanceSquared);

                if (denominator !== 0) {
                    const scale = Math.min((G * mass[node]) / denominator, Number.MAX_VALUE);
                    out.x += dx * scale;
                    out.y += dy * scale;
                }

                if (next[node] === 0) {
                    break;
                }

                node = next[node];
            } else {
                node = children[node];
            }
        }

        return out;
    }

    forceOn(body: Body, G: number, out = new Vec2(), thetaSquared = this.thetaSquared): Vec2 {
        this.accelerationAt(body.position.x, body.position.y, G, out, thetaSquared);
        out.x *= body.mass;
        out.y *= body.mass;
        return out;
    }

    private subdivide(node: number): number {
        this.ensureParentCapacity(this.parentCount + 1);
        this.ensureNodeCapacity(this.nodeCount + 4);

        this.parents[this.parentCount] = node;
        this.parentCount++;

        const children = this.nodeCount;
        this.children[node] = children;

        const childSize = this.size[node] * 0.5;
        const offset = childSize * 0.5;
        const centerX = this.centerX[node];
        const centerY = this.centerY[node];

        this.pushNode(children + 1, centerX - offset, centerY - offset, childSize);
        this.pushNode(children + 2, centerX + offset, centerY - offset, childSize);
        this.pushNode(children + 3, centerX - offset, centerY + offset, childSize);
        this.pushNode(this.next[node], centerX + offset, centerY + offset, childSize);

        return children;
    }

    private pushNode(next: number, centerX: number, centerY: number, size: number): number {
        this.ensureNodeCapacity(this.nodeCount + 1);

        const node = this.nodeCount;
        this.nodeCount++;

        this.children[node] = 0;
        this.next[node] = next;
        this.posX[node] = 0;
        this.posY[node] = 0;
        this.mass[node] = 0;
        this.centerX[node] = centerX;
        this.centerY[node] = centerY;
        this.size[node] = size;

        return node;
    }

    private findQuadrant(node: number, x: number, y: number): number {
        return ((y > this.centerY[node] ? 1 : 0) << 1) | (x > this.centerX[node] ? 1 : 0);
    }

    private ensureNodeCapacity(required: number): void {
        if (required <= this.nodeCapacity) {
            return;
        }

        const capacity = nextCapacity(this.nodeCapacity, required);

        this.children = growUint32(this.children, capacity);
        this.next = growUint32(this.next, capacity);
        this.posX = growFloat64(this.posX, capacity);
        this.posY = growFloat64(this.posY, capacity);
        this.mass = growFloat64(this.mass, capacity);
        this.centerX = growFloat64(this.centerX, capacity);
        this.centerY = growFloat64(this.centerY, capacity);
        this.size = growFloat64(this.size, capacity);

        this.nodeCapacity = capacity;
    }

    private ensureParentCapacity(required: number): void {
        if (required <= this.parentCapacity) {
            return;
        }

        const capacity = nextCapacity(this.parentCapacity, required);
        this.parents = growUint32(this.parents, capacity);
        this.parentCapacity = capacity;
    }
}

export function buildPackedQuadTree(bodies: readonly Body[], theta = 0.5, epsilon = 1): PackedQuadTree | null {
    const tree = new PackedQuadTree(theta, epsilon, Math.max(1, bodies.length * 4));
    return tree.build(bodies) ? tree : null;
}

function nextCapacity(current: number, required: number): number {
    let capacity = current;
    while (capacity < required) {
        capacity *= 2;
    }
    return capacity;
}

function growFloat64(buffer: Float64Array, capacity: number): Float64Array {
    const next = new Float64Array(capacity);
    next.set(buffer);
    return next;
}

function growUint32(buffer: Uint32Array, capacity: number): Uint32Array {
    const next = new Uint32Array(capacity);
    next.set(buffer);
    return next;
}
