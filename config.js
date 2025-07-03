import { zipDistinct } from '../functional-util.js'

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
