SRC := src/fft.c
BUILD_DIR := build
WASM := $(BUILD_DIR)/fft.wasm
WASM_JS := $(BUILD_DIR)/fft.wasm.js
EXPORTS := '["_FFT","_iFFT","_bit_reverse","_malloc"]'
EMCC_DOCKER := docker run --rm -v $(PWD):/src emscripten/emsdk emcc

.PHONY: all clean fft docker

all:
	$(MAKE) clean
	$(MAKE) $(WASM_JS)

fft: $(WASM)

docker: $(WASM)

clean:
	rm -f $(WASM) $(WASM_JS) fft.wasm fft.wasm.js fftwasm_64.all fftwasm_64.txt

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(WASM): $(SRC) | $(BUILD_DIR)
	$(EMCC_DOCKER) /src/$(SRC) -O3 -o /src/$(WASM) --no-entry -s EXPORTED_FUNCTIONS=$(EXPORTS)

$(WASM_JS): $(WASM) | $(BUILD_DIR)
	node -e "const fs=require('fs');const b=fs.readFileSync('$(WASM)');fs.writeFileSync('$(WASM_JS)', 'export const wasmbin = new Uint8Array(['+Array.from(b).join(',')+']);\n');"
