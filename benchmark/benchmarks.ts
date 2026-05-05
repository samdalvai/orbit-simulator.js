import { benchmark } from './registry';
import { runModified, runOriginal, setupWasmBenchmark } from './functions';

benchmark('wasm version', runModified, setupWasmBenchmark);
benchmark('typescript version', runOriginal);
