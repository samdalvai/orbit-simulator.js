import { RigidBody } from '../core/RigidBody';
import { BodiesFactory } from '../factory/BodiesFactory';
import { Vec2 } from '../math/Vec2';

export function randomNumber(min: number = 1.0, max: number = 10.0): number {
    return Math.random() * (max - min) + min;
}

// Returns a random color as a hex string, e.g. "#A3F4C2"
export function randomColor(): string {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    // Convert to hex and pad with zeros if needed
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

export function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(value, high));
}

export function assert(...args: (boolean | string)[]): void {
    const message = typeof args[args.length - 1] === 'string' ? (args.pop() as string) : 'Assertion failed';

    const tests = args as boolean[];

    for (let i = 0; i < tests.length; i++) {
        if (!tests[i]) throw new Error(message);
    }
}

export function randomConvexBody(x: number, y: number, radius: number, numVertices: number = -1, mass = 1): RigidBody {
    if (numVertices < 3) throw Error('Must have at least 3 vertices');

    const angles: number[] = [];

    for (let i = 0; i < numVertices; i++) angles.push(Math.random() * Math.PI * 2);

    angles.sort();

    const vertices: Vec2[] = [];

    for (const angle of angles) {
        vertices.push(new Vec2(Math.cos(angle), Math.sin(angle)).scaleNew(radius));
    }

    return BodiesFactory.polygon({ vertices, x, y, mass });
}

// a.id << 16 → shifts a.id into the upper 16 bits of a 32-bit integer
// b.id & 0xffff → ensures that only the lower 16 bits of b.id are used
// | -> bitwise OR combines them into a single 32-bit integer
export function pairKey(a: RigidBody, b: RigidBody): number {
    if (a.id < b.id) {
        return (a.id << 16) | (b.id & 0xffff);
    } else {
        return (b.id << 16) | (a.id & 0xffff);
    }
}

export function makeId(a: number, b: number): number {
    return ((a & 0xff) << 8) | (b & 0xff);
}

export function temperatureToColor(temperature: number, minTemp: number, maxTemp: number): string {
    const t = Math.max(0, Math.min(1, (temperature - minTemp) / (maxTemp - minTemp)));

    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.33) {
        // black -> red
        const k = t / 0.33;
        r = Math.round(255 * k);
    } else if (t < 0.66) {
        // red -> yellow
        const k = (t - 0.33) / 0.33;
        r = 255;
        g = Math.round(180 * k);
    } else {
        // yellow -> white
        const k = (t - 0.66) / 0.34;
        r = 255;
        g = 180 + Math.round(75 * k);
        b = Math.round(220 * k);
    }

    return `rgb(${r}, ${g}, ${b})`;
}
