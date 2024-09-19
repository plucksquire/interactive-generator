const coldHot = ['#4d4dff', '#c51600']

export const colorRamps = [coldHot]

/**
 * 
 * @param {Array} normalizedValues array of grayscale Number values in the range of [0,1]
 * @param {Array} ramp color ramp as an array of two hex color strings 
 * @returns an Array with the same size as the input array, with each element being an [R, G, B] array representing its color
 */
export function grayscaleToColorRamp(normalizedValues, ramp=coldHot) {
    const colored = new Uint8ClampedArray(normalizedValues.length * 4)
    for (let c = 0; c < normalizedValues.length; c++) {
        const color = interpolate(ramp[0], ramp[1], normalizedValues[c])
        colored[c*4 + 0] = color[0]
        colored[c*4 + 1] = color[1]
        colored[c*4 + 2] = color[2]
        colored[c*4 + 3] = 255
    }
    return colored
}

/**
 * Returns a color that is the interpolation between two colors.
 * @param {String} color1 in hex format
 * @param {String} color2 in hex format
 * @param {Number} percent between 0 and 1
 * @param {String} format 'rgb-numerical' or 'hex-string' to define the output format. Default is 'rgb-numerical'
 * @returns The interpolated color in [R, G, B] format or as a hex string
 */
function interpolate(color1, color2, percent, format='rgb-numerical') {
    // Convert the hex colors to RGB values
    const r1 = parseInt(color1.substring(1, 3), 16)
    const g1 = parseInt(color1.substring(3, 5), 16)
    const b1 = parseInt(color1.substring(5, 7), 16)

    const r2 = parseInt(color2.substring(1, 3), 16)
    const g2 = parseInt(color2.substring(3, 5), 16)
    const b2 = parseInt(color2.substring(5, 7), 16)

    // Interpolate the RGB values
    const r = Math.round(r1 + (r2 - r1) * percent)
    const g = Math.round(g1 + (g2 - g1) * percent)
    const b = Math.round(b1 + (b2 - b1) * percent)

    // Convert the interpolated RGB values back to a hex color
    return format === 'rgb-numerical' ? [r, g, b] : ('#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1))
}
