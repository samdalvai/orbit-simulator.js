export function assert(...args: (boolean | string)[]): void {
    const message = typeof args[args.length - 1] === 'string' ? (args.pop() as string) : 'Assertion failed';

    const tests = args as boolean[];

    for (let i = 0; i < tests.length; i++) {
        if (!tests[i]) throw new Error(message);
    }
}
