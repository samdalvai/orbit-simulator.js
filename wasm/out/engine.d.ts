export type Pointer = number;
export type BodyId = number;
export type BodyType = 0 | 1 | 2 | 3;
export type EngineResult = number;
export type QuadTreeResult = number;

export type EngineRuntimeCallback = (module: EngineModule) => void;

export interface EngineModuleOptions {
    locateFile?: (path: string, prefix: string) => string;
    instantiateWasm?: (
        imports: WebAssembly.Imports,
        successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
    ) => WebAssembly.Exports | Promise<WebAssembly.Exports> | void;
    wasmBinary?: ArrayBuffer | Uint8Array;
    onRuntimeInitialized?: () => void;
    onAbort?: (reason: unknown) => void;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    setStatus?: (text: string) => void;
    mainScriptUrlOrBlob?: string | Blob;
    arguments?: string[];
    thisProgram?: string;
    preRun?: EngineRuntimeCallback | EngineRuntimeCallback[];
    postRun?: EngineRuntimeCallback | EngineRuntimeCallback[];
    preInit?: (() => void) | Array<() => void>;
    noExitRuntime?: boolean;
}

export interface EngineModule {
    calledRun?: boolean;

    HEAPU8: Uint8Array;
    HEAP32: Int32Array;
    HEAPU32: Uint32Array;
    HEAPF64: Float64Array;

    _update(dt: number): EngineResult;
    _initializeVerlet(): EngineResult;
    _clearAllForces(): void;

    _getBodyCount(): number;
    _getMaxBodies(): number;
    _clearBodies(): void;
    _addNewBody(
        x: number,
        y: number,
        radius: number,
        mass: number,
        bodyType: BodyType,
        velX: number,
        velY: number,
        parent: BodyId,
    ): BodyId;
    _removeBody(index: BodyId): BodyId;
    _addForceXY(id: BodyId, x: number, y: number): void;
    _clearForces(id: BodyId): void;
    _initializeAcceleration(id: BodyId): void;
    _integrateVerletPosition(id: BodyId, dt: number): void;
    _integrateVerletVelocity(id: BodyId, dt: number): void;

    _applyBarnesHutGravitationalForces(G: number, theta: number, epsilon: number): QuadTreeResult;

    _getNodeCount(): number;
    _getParentCount(): number;
    _getThetaSquared(): number;
    _buildPackedQuadTree(theta: number, epsilon: number): QuadTreeResult;
    _clearQuadTree(rootCenterX: number, rootCenterY: number, rootSize: number): void;
    _insertXYMass(x: number, y: number, bodyMass: number): QuadTreeResult;
    _propagate(): void;
    _applyForceOn(bodyId: BodyId, x: number, y: number, G: number, thetaSq: number): void;

    readonly _parents: Pointer;
    readonly _bodyTypes: Pointer;
    readonly _radiuses: Pointer;
    readonly _posX: Pointer;
    readonly _posY: Pointer;
    readonly _velX: Pointer;
    readonly _velY: Pointer;
    readonly _accX: Pointer;
    readonly _accY: Pointer;
    readonly _sumForcesX: Pointer;
    readonly _sumForcesY: Pointer;
    readonly _masses: Pointer;
    readonly _invMasses: Pointer;
    readonly _bodyCount: Pointer;

    readonly _children: Pointer;
    readonly _next: Pointer;
    readonly _nodePosX: Pointer;
    readonly _nodePosY: Pointer;
    readonly _mass: Pointer;
    readonly _centerX: Pointer;
    readonly _centerY: Pointer;
    readonly _size: Pointer;
    readonly _parentNodes: Pointer;
    readonly _nodeCount: Pointer;
    readonly _parentCount: Pointer;
    readonly _thetaSquared: Pointer;
    readonly _epsilonSquared: Pointer;
}

export default function createEngineModule(options?: EngineModuleOptions): Promise<EngineModule>;
