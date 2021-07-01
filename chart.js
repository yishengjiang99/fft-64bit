window.onerror = (e) =>
  (document.body.innerHTML = e.type + document.body.innerHTML);
const width = 1024 / 2,
  height = 400;
export function resetCanvas(canvasCtx) {
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.fillRect(0, 0, width, height);
}
export function chart(canvasCtx, dataArray) {
  let sum = 0,
    min = dataArray[0],
    max = dataArray[0];
  let x = 0,
    iwidth = width / dataArray.length; //strokeText(`r m s : ${sum / bufferLength}`, 10, 20, 100)
  for (let i = 1; i < dataArray.length; i++) {
    max = dataArray[i] > max ? dataArray[i] : max;
    min = dataArray[i] < min ? dataArray[i] : min;
  }
  // canvasCtx.beginPath();

  canvasCtx.moveTo(0, ((dataArray[0] - min) / (max - min)) * height);
  for (let i = 1; i < dataArray.length; i++) {
    sum += Math.pow(2, dataArray[i]);
    x += iwidth;
    canvasCtx.lineTo(x, ((dataArray[i] - min) / (max - min)) * height);
  }
  canvasCtx.stroke();
  canvasCtx.restore();
  canvasCtx.strokeText(
    `rms: ${(sum / dataArray.length).toFixed(2)}`,
    20,
    40,
    100
  );
}
export function mkcanvas() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);

  const canvasCtx = canvas.getContext("2d");
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "white";
  canvasCtx.fillStyle = "black";
  canvasCtx.font = "2em";
  document.body.append(canvas);
  return canvasCtx;
}
