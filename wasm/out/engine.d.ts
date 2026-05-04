export interface EngineModuleOptions {
    locateFile?: (path: string, prefix: string) => string;
}

export interface EngineModule {
    /** Whatever */
    _update(dt: number): number;

    _getBodyCount(): number;

    HEAPF64: Float64Array;
    HEAPU32: Uint32Array;
}

export default function createEngineModule(options?: EngineModuleOptions): Promise<EngineModule>;
