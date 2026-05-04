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

Output:

```text
out/engine.wasm
```

## Clean Build Outputs

```shell
make clean
```
