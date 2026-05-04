OUT_DIR := out

CC ?= cc
EMCC ?= emcc

CFLAGS ?= -std=c11 -Wall -O2
LDLIBS ?= -lm

ENGINE_SOURCES := body.c engine.c gravity.c quad_tree.c
NATIVE_SOURCES := $(ENGINE_SOURCES) main.c

NATIVE_TARGET := $(OUT_DIR)/engine-test
WASM_TARGET := $(OUT_DIR)/engine.wasm

WASM_EXPORTED_FUNCTIONS := \
	_update \
	_initializeVerlet \
	_clearAllForces \
	_getBodyCount \
	_clearBodies \
	_addNewBody \
	_removeBody \
	_addForceXY \
	_clearForces \
	_initializeAcceleration \
	_integrateVerletPosition \
	_integrateVerletVelocity \
	_applyBarnesHutGravitationalForces \
	_getNodeCount \
	_getParentCount \
	_getThetaSquared \
	_buildPackedQuadTree \
	_clearQuadTree \
	_insertXYMass \
	_propagate \
	_applyForceOn

comma := ,
empty :=
space := $(empty) $(empty)
WASM_EXPORT_LIST := $(subst $(space),$(comma),$(strip $(WASM_EXPORTED_FUNCTIONS)))
WASM_EXPORT_FLAGS := -sEXPORTED_FUNCTIONS=$(WASM_EXPORT_LIST)
WASM_FLAGS ?= -O3 --no-entry -sSTANDALONE_WASM=1

.PHONY: build native test wasm run run-native clean

build: native

native: $(NATIVE_TARGET)

test: native

$(NATIVE_TARGET): $(NATIVE_SOURCES) *.h | $(OUT_DIR)
	$(CC) $(CFLAGS) $(NATIVE_SOURCES) -o $@ $(LDLIBS)

wasm: $(WASM_TARGET)

$(WASM_TARGET): $(ENGINE_SOURCES) *.h | $(OUT_DIR)
	$(EMCC) $(WASM_FLAGS) $(WASM_EXPORT_FLAGS) $(ENGINE_SOURCES) -o $@ $(LDLIBS)

run: run-native

run-native: $(NATIVE_TARGET)
	./$(NATIVE_TARGET)

$(OUT_DIR):
	mkdir -p $(OUT_DIR)

clean:
	rm -rf $(OUT_DIR) build app
