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

export function assert(...args: (boolean | string)[]): void {
    const message = typeof args[args.length - 1] === 'string' ? (args.pop() as string) : 'Assertion failed';

    const tests = args as boolean[];

    for (let i = 0; i < tests.length; i++) {
        if (!tests[i]) throw new Error(message);
    }
}
