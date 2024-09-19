import { zipDistinct } from './functional-util.js'

export const DOMAINS = {
  front: 'front',
  left: 'left',
  back: 'back',
  right: 'right',

  any: 'any',
  many: 'many'
}

const localOrRemoteModels = window.location.href.includes('github.io') ? 'remote' : 'local'
const modelUrlPrefix = localOrRemoteModels === 'remote' ? 'https://fegemo.github.io/' : ''

export const config = {
  pix2pix: {
    inputs: ['sourceImage'],
    name: 'pix2pix',
    version: 'all,230224',
    get checkpoints() {
      return Array.from(zipDistinct([DOMAINS.front, DOMAINS.right, DOMAINS.back, DOMAINS.left]))
        .map(([source, target]) => ({
          source,
          target,
          file: `${modelUrlPrefix}pixel-sides-models/${this.name}/${this.version}/${source}-to-${target}/model.json`
        })
        )
    },
    get endpoint() {
      return `/api/${this.name}/${this.version}/{source}/2/{target}`
    }
  },
  stargan: {
    // inputs: ['sourceImage', 'targetDomain-channelized'],
    // inputs: ['targetDomain', 'sourceImage'],
    inputs: ['sourceDomain', 'targetDomain', 'sourceImage'],
    name: 'stargan',
    // version: 'all,301222',
    // version: 'all,200224,network-none',
    version: 'all,200224,network-generator',
    get checkpoints() {
      return [{
          file: `${modelUrlPrefix}pixel-sides-models/${this.name}/${this.version}/model.json`,
          source: DOMAINS.any,
          target: DOMAINS.any
        }]
      },
    get endpoint() {
      return `/api/${this.name}/${this.version}/2/{target}`
    }
  },
  collagan: {
    name: 'collagan',
    version: 'all,280824,sbgames24',
    inputs: ['targetDomain', 'sourceImages'],
    debugInfo: {
      outputNodeNames: [
        // real output: the last convolution
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_159/Tanh',
        // decoder partial outputs: the transpose convolutions that upscale 2x (purple boxes)
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose_3/BiasAdd',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose_2/BiasAdd',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose_1/BiasAdd',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose/BiasAdd',
        // encoder partial outputs: the downscaling convolutions (red boxes)
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_112/Conv2D', // 8 -> 4
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_124/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_136/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_148/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_109/Conv2D', // 16 -> 8
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_121/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_133/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_145/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_106/Conv2D', // 32 -> 16
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_118/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_130/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_142/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_103/Conv2D', // 64 -> 32
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_115/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_127/Conv2D',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_139/Conv2D',
        // encoder partial outputs: last relu right before the downsampling convolutions
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_7/Relu', // 64
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_15/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_23/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_31/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_5/Relu', // 32
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_13/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_21/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_29/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_3/Relu', // 16
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_11/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_19/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_27/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_1/Relu', // 8
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_9/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_17/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_25/Relu',
        // decoder partial outputs: last relu right before the upsampling convolutions
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_41/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_39/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_37/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_35/Relu',
        'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_33/Relu',
      ]
    },
    get checkpoints() {
      return [{
        file: `${modelUrlPrefix}pixel-sides-models/${this.name}/${this.version}/model.json`,
        source: DOMAINS.many,
        target: DOMAINS.any
      }]
    },
    get endpoint() {
      return `/api/${this.name}/${this.version}/2/{target}`
    }
  }
}
