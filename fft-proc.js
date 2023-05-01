import { wasmbin } from "./fft.wasm.js";

function registerProcessor(name, processorCtor) {
  // thanks https://github.com/guest271314/webtransport/blob/main/webTransportAudioWorkletWebAssemblyMemoryGrow.js
  return `console.log(globalThis);\n${processorCtor};\nregisterProcessor('${name}', ${processorCtor.name});`;
}
export default class FFTNode extends AudioWorkletNode {
  static async init(ctx) {
    const procUrl = URL.createObjectURL(
      new Blob([registerProcessor("proc-fft", FFTProc)], {
        type: "text/javascript",
      }),
      { type: "module" }
    );
    self.wasmModule = await WebAssembly.compile(wasmbin);
    await ctx.audioWorklet
      .addModule(procUrl, { credentials: "omit" })
      .catch((e) => console.trace(e));
  }
  constructor(ctx, outputChannelCount = [2]) {
    super(ctx, "proc-fft", {
      numberOfInputs: outputChannelCount.length,
      numberOfOutputs: outputChannelCount.length,
      outputChannelCount: outputChannelCount,
      processorOptions: {
        jsModule: self.jsModule,
        wasmModule: self.wasmModule,
      },
    });
    this.port.onmessage = ({ data: { bins, waveForm } }) => {
      this.waveFormBuffer = waveForm;
      this.fftBuffer = bins;
    };
  }
  getByteTimeDomainData() {
    return new Float64Array(this.waveFormBuffer);
  }
  getWaveForm() {
    return new Float64Array(this.waveFormBuffer);
  }
  getFloatFrequencyData() {
    return new Float64Array(this.fftBuffer);
  }
}

class AudioWorkletProcessor {}

class FFTProc extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    const { wasmModule } = options.processorOptions;
    this.wasmModule = wasmModule;

    this.fft = this.FFT64(12, new WebAssembly.Instance(wasmModule));
  }
  FFT64(n = 12, instance) {
    const sizeof_double = Float64Array.BYTES_PER_ELEMENT;
    const N = 1 << n;
    const FFT = instance.exports.FFT;
    const iFFT = instance.exports.iFFT;
    const bit_reverse = instance.exports.bit_reverse;

    const heap = instance.exports.memory.buffer;

    const stblRef = instance.exports.malloc((N / 4) * sizeof_double);
    const stbl = new Float64Array(heap, stblRef, N / 4);
    for (let i = 0; i < N / 4; i++) {
      stbl[i] = Math.sin((2 * Math.PI * i) / N);
    }

    const complexRef = instance.exports.malloc(N * 2 * sizeof_double);
    const complex = new Float64Array(heap, complexRef, 2 * N);

    let wptr = 0,
      rptr = 0;

    function bzeroArray(ref, k) {
      for (let i = 0; i < k; i++) {
        complex[ref + i] = 0;
      }
    }

    const inputPCM = (arr) => {
      bzeroArray(complexRef, N);
      wptr = 0;
      arr.forEach((v) => {
        complex[wptr] = v;
        complex[wptr + 1] = 0;
        wptr += 2;
      });
    };
    function getFloatFrequencyData() {
      FFT(complexRef, n, stblRef);

      return complex.filter((v, idx) => idx < N / 2 && idx % 2 == 1);
    }
    function getWaveForm() {
      iFFT(complexRef, n, stblRef);
      return complex.slice(0, N / 6).filter((v, idx) => idx % 2 == 0);
    }
    function reset() {
      wptr = 0;
      rptr = 0;
      bzeroArray(complexRef, 10 * N);
    }
    return {
      stbl,
      reset,
      stblRef,
      complexRef,
      getFloatFrequencyData,
      inputPCM,
      FFT,
      iFFT,
      bit_reverse,
      getWaveForm,
      instance,
      complex,
      heap,
      wptr,
    };
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    for (let channel = 0; channel < output.length; channel++) {
      if (input[channel]) output[channel].set(input[channel]);
    }
    new Promise((r) => r()).then(() => {
      if (input[0]) {
        this.fft.inputPCM(input[0]);
        const bins = this.fft.getFloatFrequencyData();
        const waveForms = this.fft.getWaveForm();
        this.port.postMessage(
          {
            bins: bins.buffer,
            waveForm: waveForms.buffer,
          },
          [waveForms.buffer, bins.buffer]
        );
      }
    });
    return true;
  }
}
