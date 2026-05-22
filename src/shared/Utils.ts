import { WEB_WORKERS_ENABLED } from './Constants';

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
    if (days < 30.5) {
        return `${days.toFixed(2)} d`;
    }

    const months = days / 30.4; // Average days per month in a year
    if (months < 12) {
        return `${months.toFixed(2)} m`;
    }

    const years = months / 12;
    return `${years.toFixed(2)} y`;
}

export function createFloat64Buffer(length: number): Float64Array {
    const byteLength = Float64Array.BYTES_PER_ELEMENT * length;

    const buffer = WEB_WORKERS_ENABLED ? new SharedArrayBuffer(byteLength) : new ArrayBuffer(byteLength);

    return new Float64Array(buffer);
}
