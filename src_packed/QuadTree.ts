import { Body } from './Body';
import { Vec2 } from './Vec2';

export type Quad = {
    centerX: number;
    centerY: number;
    size: number;
};

export type QuadNode = {
    children: number;
    next: number;
    posX: number;
    posY: number;
    mass: number;
    quad: Quad;
};

export class QuadTree {
    static readonly ROOT = 0;

    thetaSquared: number;
    epsilonSquared: number;
    readonly nodes: QuadNode[] = [];
    private readonly parents: number[] = [];

    constructor(theta = 0.5, epsilon = 1) {
        this.thetaSquared = theta * theta;
        this.epsilonSquared = epsilon * epsilon;
    }

    static newContaining(bodies: readonly Body[]): Quad | null {
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
        const quad = QuadTree.newContaining(bodies);
        if (quad === null) {
            this.nodes.length = 0;
            this.parents.length = 0;
            return false;
        }

        this.clear(quad);

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            this.insert(body.position, body.mass);
        }

        this.propagate();
        return true;
    }

    clear(quad: Quad): void {
        this.nodes.length = 0;
        this.parents.length = 0;
        this.nodes.push(createNode(0, quad));
    }

    insert(pos: Vec2, mass: number): void {
        if (mass === 0) return;

        let node = QuadTree.ROOT;

        while (this.nodes[node].children !== 0) {
            const quadrant = findQuadrant(this.nodes[node].quad, pos.x, pos.y);
            node = this.nodes[node].children + quadrant;
        }

        if (this.nodes[node].mass === 0) {
            this.nodes[node].posX = pos.x;
            this.nodes[node].posY = pos.y;
            this.nodes[node].mass = mass;
            return;
        }

        const x = this.nodes[node].posX;
        const y = this.nodes[node].posY;
        const existingMass = this.nodes[node].mass;

        if (pos.x === x && pos.y === y) {
            this.nodes[node].mass += mass;
            return;
        }

        for (;;) {
            const children = this.subdivide(node);
            const q1 = findQuadrant(this.nodes[node].quad, x, y);
            const q2 = findQuadrant(this.nodes[node].quad, pos.x, pos.y);

            if (q1 === q2) {
                node = children + q1;
                continue;
            }

            const n1 = this.nodes[children + q1];
            n1.posX = x;
            n1.posY = y;
            n1.mass = existingMass;

            const n2 = this.nodes[children + q2];
            n2.posX = pos.x;
            n2.posY = pos.y;
            n2.mass = mass;
            return;
        }
    }

    propagate(): void {
        for (let p = this.parents.length - 1; p >= 0; p--) {
            const nodeIndex = this.parents[p];
            const firstChild = this.nodes[nodeIndex].children;

            let x = 0;
            let y = 0;
            let mass = 0;

            for (let i = 0; i < 4; i++) {
                const child = this.nodes[firstChild + i];
                x += child.posX * child.mass;
                y += child.posY * child.mass;
                mass += child.mass;
            }

            const node = this.nodes[nodeIndex];
            node.mass = mass;
            node.posX = x / mass;
            node.posY = y / mass;
        }
    }

    accelerationAt(x: number, y: number, G: number, out = new Vec2(), thetaSquared = this.thetaSquared): Vec2 {
        out.x = 0;
        out.y = 0;

        if (this.nodes.length === 0) {
            return out;
        }

        let nodeIndex = QuadTree.ROOT;

        for (;;) {
            const node = this.nodes[nodeIndex];
            const dx = node.posX - x;
            const dy = node.posY - y;
            const distanceSquared = dx * dx + dy * dy;

            if (node.children === 0 || node.quad.size * node.quad.size < distanceSquared * thetaSquared) {
                const denominator = (distanceSquared + this.epsilonSquared) * Math.sqrt(distanceSquared);

                if (denominator !== 0) {
                    const scale = Math.min((G * node.mass) / denominator, Number.MAX_VALUE);
                    out.x += dx * scale;
                    out.y += dy * scale;
                }

                if (node.next === 0) {
                    break;
                }

                nodeIndex = node.next;
            } else {
                nodeIndex = node.children;
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

    private subdivide(nodeIndex: number): number {
        this.parents.push(nodeIndex);

        const node = this.nodes[nodeIndex];
        const children = this.nodes.length;
        node.children = children;

        this.nodes.push(createNode(children + 1, intoQuadrant(node.quad, 0)));
        this.nodes.push(createNode(children + 2, intoQuadrant(node.quad, 1)));
        this.nodes.push(createNode(children + 3, intoQuadrant(node.quad, 2)));
        this.nodes.push(createNode(node.next, intoQuadrant(node.quad, 3)));

        return children;
    }
}

export function buildQuadTree(bodies: readonly Body[], theta = 0.5, epsilon = 1): QuadTree | null {
    const tree = new QuadTree(theta, epsilon);
    return tree.build(bodies) ? tree : null;
}

export function canApproximate(node: QuadNode, body: Body, theta: number): boolean {
    const dx = node.posX - body.position.x;
    const dy = node.posY - body.position.y;
    const distanceSquared = dx * dx + dy * dy;

    return theta > 0 && node.quad.size * node.quad.size < distanceSquared * theta * theta;
}

function createNode(next: number, quad: Quad): QuadNode {
    return {
        children: 0,
        next,
        posX: 0,
        posY: 0,
        mass: 0,
        quad,
    };
}

function findQuadrant(quad: Quad, x: number, y: number): number {
    return ((y > quad.centerY ? 1 : 0) << 1) | (x > quad.centerX ? 1 : 0);
}

function intoQuadrant(quad: Quad, quadrant: number): Quad {
    const size = quad.size * 0.5;

    return {
        centerX: quad.centerX + ((quadrant & 1) - 0.5) * size,
        centerY: quad.centerY + (((quadrant >> 1) & 1) - 0.5) * size,
        size,
    };
}
