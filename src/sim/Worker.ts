// Body buffers
let mass: Float64Array;

let positionX: Float64Array;
let positionY: Float64Array;
let positionZ: Float64Array;

let forceSumX: Float64Array;
let forceSumY: Float64Array;
let forceSumZ: Float64Array;

// OcTree buffers
let nodeMass: Float64Array;
let nodePositionX: Float64Array;
let nodePositionY: Float64Array;
let nodePositionZ: Float64Array;
let size: Float64Array;
let children: Uint32Array;
let next: Uint32Array;

const ROOT = 0;

export type WorkerInitMessage = {
    buffers: {
        mass: Float64Array;
        positionX: Float64Array;
        positionY: Float64Array;
        positionZ: Float64Array;
        forceSumX: Float64Array;
        forceSumY: Float64Array;
        forceSumZ: Float64Array;

        nodeMass: Float64Array;
        nodePositionX: Float64Array;
        nodePositionY: Float64Array;
        nodePositionZ: Float64Array;
        size: Float64Array;
        children: Uint32Array;
        next: Uint32Array;
    };
    type: 'init';
};

export type WorkerJobMessage = {
    id?: number;
    start: number;
    end: number;
    G: number;
    thetaSq: number;
    epsilonSquared: number;
    nodeCount: number;
    type: 'applyForce';
};

type WorkerMessage = WorkerInitMessage | WorkerJobMessage;

self.onmessage = event => {
    const message = event.data as WorkerMessage;

    switch (message.type) {
        case 'init':
            console.log('Worker initialized');

            // Body buffers
            positionX = new Float64Array(message.buffers.positionX);
            positionY = new Float64Array(message.buffers.positionY);
            positionZ = new Float64Array(message.buffers.positionZ);
            mass = new Float64Array(message.buffers.mass);
            forceSumX = new Float64Array(message.buffers.forceSumX);
            forceSumY = new Float64Array(message.buffers.forceSumY);
            forceSumZ = new Float64Array(message.buffers.forceSumZ);

            // OcTree buffers
            nodePositionX = new Float64Array(message.buffers.nodePositionX);
            nodePositionY = new Float64Array(message.buffers.nodePositionY);
            nodePositionZ = new Float64Array(message.buffers.nodePositionZ);
            nodeMass = new Float64Array(message.buffers.nodeMass);
            size = new Float64Array(message.buffers.size);
            children = new Uint32Array(message.buffers.children);
            next = new Uint32Array(message.buffers.children);

            self.postMessage({
                type: 'ready',
            });
            break;
        case 'applyForce':
            applyForcesRange(
                message.start,
                message.end,
                message.G,
                message.thetaSq,
                message.epsilonSquared,
                message.nodeCount,
            );

            self.postMessage({
                type: 'forcesApplied',
                id: message.id,
                message: performance.now(),
            });
            break;
        default:
            throw new Error('Unrecognized message type: ' + message);
    }
};

function applyForcesRange(
    start: number,
    end: number,
    G: number,
    thetaSq: number,
    epsilonSquared: number,
    nodeCount: number,
): void {
    for (let bodyIndex = start; bodyIndex < end; bodyIndex++) {
        applyForceOn(
            bodyIndex,
            positionX[bodyIndex],
            positionY[bodyIndex],
            positionZ[bodyIndex],
            G,
            thetaSq,
            epsilonSquared,
            nodeCount,
        );
    }
    // console.log('Applied force on: ', start, end);
}

function applyForceOn(
    bodyIndex: number,
    x: number,
    y: number,
    z: number,
    G: number,
    thetaSq: number,
    epsilonSquared: number,
    nodeCount: number,
): void {
    let accX = 0;
    let accY = 0;
    let accZ = 0;

    if (nodeCount === 0) {
        return;
    }

    let node = ROOT;

    for (;;) {
        const dx = nodePositionX[node] - x;
        const dy = nodePositionY[node] - y;
        const dz = nodePositionZ[node] - z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;

        if (children[node] === 0 || size[node] * size[node] < distanceSquared * thetaSq) {
            const denominator = (distanceSquared + epsilonSquared) * Math.sqrt(distanceSquared);

            if (denominator !== 0) {
                const scale = Math.min((G * nodeMass[node]) / denominator, Number.MAX_VALUE);
                accX += dx * scale;
                accY += dy * scale;
                accZ += dz * scale;
            }

            if (next[node] === 0) {
                break;
            }

            node = next[node];
        } else {
            node = children[node];
        }
    }

    const bodyMass = mass[bodyIndex];
    forceSumX[bodyIndex] += accX * bodyMass;
    forceSumY[bodyIndex] += accY * bodyMass;
    forceSumZ[bodyIndex] += accZ * bodyMass;
}

let nextRequestId = 0;

const pendingRequests = new Map<number, () => void>();

export function setupWorker(worker: Worker): void {
    worker.onmessage = event => {
        const message = event.data;
        console.log(message);

        const resolve = pendingRequests.get(message.id);

        if (resolve) {
            pendingRequests.delete(message.id);
            resolve();
        }
    };
}

export function runWorkerJob(worker: Worker, message: WorkerJobMessage): Promise<void> {
    return new Promise(resolve => {
        const id = nextRequestId++;

        pendingRequests.set(id, resolve);

        worker.postMessage({
            ...message,
            id,
        });
    });
}
