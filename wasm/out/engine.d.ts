export interface EngineModuleOptions {
    locateFile?: (path: string, prefix: string) => string;
}

export interface EngineModule {
    /** Whatever */
    _update(dt: number): number;
}

export default function createEngineModule(options?: EngineModuleOptions): Promise<EngineModule>;
