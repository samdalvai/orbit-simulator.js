import { WorkerJobMessage } from './Worker';

let nextRequestId = 0;

const pendingRequests = new Map<number, () => void>();

export function setupWorker(worker: Worker): void {
    worker.onmessage = event => {
        const message = event.data;

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
