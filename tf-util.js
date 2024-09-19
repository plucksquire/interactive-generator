import { grayscaleToColorRamp } from './color-util.js'

// Simpler reimplementation of tf.browser.toPixels but without receiving a canvas,
// rather returning a byte array, a width and height
// Based on: https://github.com/tensorflow/tfjs/blob/tfjs-v4.1.0/tfjs-core/src/ops/browser.ts#L292-L372
export async function detensorize(tensor) {
  const data = await tensor.data()
  const [height, width, channels] = tensor.shape
  const multiplier = tensor.dtype === 'float32' ? 255 : 1
  const pixels = new Uint8ClampedArray(height * width * 4)
  
  for (let v = 0; v < height * width * channels; v += 4) {
    pixels[v+0] = Math.round(data[v+0] * multiplier)
    pixels[v+1] = Math.round(data[v+1] * multiplier)
    pixels[v+2] = Math.round(data[v+2] * multiplier)
    pixels[v+3] = Math.round(data[v+3] * multiplier)
  }

  return { pixels, width, height }
}

export async function detensorizeGrayscale(tensor) {
  const data = await tensor.data()
  const [height, width] = tensor.shape
  const multiplier = tensor.dtype === 'float32' ? 255 : 1
  const pixels = new Uint8ClampedArray(height * width * 4)
  
  for (let v = 0; v < height * width; v++) {
    const value = Math.round(data[v] * multiplier)
    pixels[v*4+0] = value
    pixels[v*4+1] = value
    pixels[v*4+2] = value
    pixels[v*4+3] = value
  }

  return { pixels, width, height }
}

export async function detensorizeGrayscaleWithColormap(tensor) {
  const data = await tensor.data()
  const pixels = grayscaleToColorRamp(data)
  const [height, width] = tensor.shape

  return { pixels, width, height }
  
}

export function normalizeTensor(tensor) {
  const [min, max] = [tensor.min(), tensor.max()]
  const normalized = tensor.sub(min).div(max.sub(min))
  return normalized
}