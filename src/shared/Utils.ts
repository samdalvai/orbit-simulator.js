export function assert(...args: (boolean | string)[]): void {
    const message = typeof args[args.length - 1] === 'string' ? (args.pop() as string) : 'Assertion failed';

    const tests = args as boolean[];

    for (let i = 0; i < tests.length; i++) {
        if (!tests[i]) throw new Error(message);
    }
}

export function formatDuration(seconds: number): string {
    const minutes = seconds / 60;
    if (minutes < 60) {
        return `${minutes.toFixed(2)} min`;
    }

    const hours = minutes / 60;
    if (hours < 24) {
        return `${hours.toFixed(2)} h`;
    }

    const days = hours / 24;
    return `${days.toFixed(2)} d`;
}
