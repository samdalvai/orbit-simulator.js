## Build Profiles

```shell
make native
```

Builds the C test executable with `main.c` included:

```text
out/engine-test
```

`make build` is kept as an alias for `make native`.

## Run Native Test

```shell
make run-native
```

`make run` is kept as an alias for `make run-native`.

## Build Wasm

Requires Emscripten's `emcc` on your `PATH`.

```shell
make wasm
```

Builds the wasm port without `main.c`, using only:

```text
body.c
engine.c
gravity.c
quad_tree.c
```

The wasm build enables pthreads by default so force application can run in parallel:

```make
WASM_THREAD_FLAGS ?= -pthread -DENGINE_USE_PTHREADS -DENGINE_FORCE_THREADS=4 -sPTHREAD_POOL_SIZE=3
```

`ENGINE_FORCE_THREADS` is the total number of force chunks, including the main thread. `PTHREAD_POOL_SIZE` is the number of worker threads Emscripten preloads, so it should normally be `ENGINE_FORCE_THREADS - 1`.

To tune the worker count, rebuild with matching values:

```shell
make -B wasm WASM_THREAD_FLAGS="-pthread -DENGINE_USE_PTHREADS -DENGINE_FORCE_THREADS=4 -sPTHREAD_POOL_SIZE=3"
```

To build a serial wasm version for comparison:

```shell
make -B wasm WASM_THREAD_FLAGS=
```

Browser pthread builds require `SharedArrayBuffer`, which means the page must be cross-origin isolated. Serve the app with these headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

`npm start` loads `.proxyrc.cjs`, so the Parcel dev server sends these headers automatically. Any other server used for the threaded wasm build must send equivalent headers.

Output:

```text
out/engine.js
out/engine.wasm
```

## Clean Build Outputs

```shell
make clean
```
