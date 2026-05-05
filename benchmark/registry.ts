export type Benchmark = {
    name: string;
    run: () => unknown;
    setup?: () => void | Promise<void>;
};

export const benchmarks: Benchmark[] = [];

export function benchmark(name: string, run: () => unknown, setup?: () => void | Promise<void>) {
    benchmarks.push({ name, run, setup });
}
