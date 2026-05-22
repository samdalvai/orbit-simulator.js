self.onmessage = event => {
    const message = event.data;

    switch (message.type) {
        case 'init':
            console.log('Worker initialized');

            self.postMessage({
                type: 'ready',
            });
            break;
    }
};
