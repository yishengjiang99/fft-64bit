fft:
	docker run --rm -v $(pwd):/src emscripten/emsdk \
	emcc fft.c -o fft.wasm --no-entry \
	-s EXPORTED_FUNCTIONS='["_FFT","_iFFT","_bit_reverse","_malloc"]'

b64:
	cat fft.wasm |base64 > fftwasm_64.all: fft.wasm.js

clean: 
	rm -f *wasm*

fft.wasm: fft.c clean
	emcc fft.c -O3 -o fft.wasm --no-entry -s EXPORTED_FUNCTIONS='["_FFT","_iFFT","_bit_reverse"]'

fft.wasm.js: fft.wasm
	cat fft.wasm |npx encode-wasm-uint8 > fft.wasm.js



