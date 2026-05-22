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

interface WorkerMessage {
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
        nodeCount: number;
    };
    type: 'init' | 'applyForce';
}

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
            console.log('I need to apply forces');
            break;
        default:
            throw new Error('Unrecognized message type: ' + message.type);
    }
};
