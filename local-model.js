import { config, DOMAINS } from './config.js'
import { AsyncTask, dynamicImport, TaskAbortion } from './task.js'
import { detensorize } from './tf-util.js'
import { ModelProxy, GeneratorProxy } from './model-proxy.js'


// loads tensorflow as soon as someone imports this module
const tf = await dynamicImport('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.1.0/dist/tf.js', 'tf')


export class LocalModel extends ModelProxy {
    #tfLoaded

    constructor(architecture) {
        super()
        this.architecture = architecture
        this.config = config[architecture]
    }

    async initialize() {
        // loads all checkpoints from this architecture
        const checkpoints = this.config.checkpoints

        for (let domain of Object.keys(DOMAINS)) {
            this._generators[domain] = {}
        }

        const loadModelTasks = checkpoints.map(ckpt => new LocalModel.LoadModelTask(tf, ckpt))
        const promises = loadModelTasks.map(task => task.run())

        for (let promise of promises) {
            promise.then(({ model, ckpt }) => {
                const generator = new LocalGenerator(this, model, tf)
                this._generators[ckpt.source][ckpt.target] = generator
            }).catch(error => {
                if (error instanceof TaskAbortion) {
                    console.info(`Silently cancelled model loading task #${promises.indexOf(promise)}`)
                }
            })
        }

        // warms up tensorflow by doing a single inference (doesnt matter which model is used)
        const warmUpPromise = Promise.race(promises).then(({ model }) => this.warmup(model))
        this._loaded = Promise.all([this.#tfLoaded, ...promises, warmUpPromise])

        return loadModelTasks
    }

    async warmup(model) {
        const zeros = model.inputs.map(input => tf.zeros([1, ...input.shape.slice(1)]))
        model.predict(zeros).dispose()
        zeros.forEach(z => z.dispose())
        return model
    }

    selectGenerator(sourceDomains, targetDomains) {
        const isMultiSource = Array.isArray(sourceDomains) && sourceDomains.length > 1
        const isMultiTarget = Array.isArray(targetDomains) && targetDomains.length > 1

        if (isMultiTarget) {
            throw new Error('Not yet implemented "selectGenerator" with multi target on LocalModel')
        }

        if (isMultiSource) {
            // throw new Error('Not yet implemented "selectGenerator" with multi source (colla) on LocalModel')
            return this._generators[DOMAINS.many][DOMAINS.any]
        } else {
            const source = Array.isArray(sourceDomains) ? sourceDomains[0] : sourceDomains
            const target = Array.isArray(targetDomains) ? targetDomains[0] : targetDomains

            const generator = this._generators[source][target] ||
                this._generators[source][DOMAINS.any] ||
                this._generators[DOMAINS.any][target] ||
                this._generators[DOMAINS.any][DOMAINS.any]
            return generator
        }
    }

    static get LoadModelTask() {
        return class LoadModelTask extends AsyncTask {
            #tf
            #checkpoint
            #shouldCache

            constructor(tf, checkpoint, cache = true) {
                super()
                this.#tf = tf
                this.#checkpoint = checkpoint
                this.#shouldCache = cache
            }

            _execute(signal) {
                const tf = this.#tf
                const file = this.#checkpoint.file

                const onProgress = value => this._progress.set(value)

                const promise = new Promise((resolve, reject) => {
                    signal.addEventListener('abort', () => { reject(new TaskAbortion(this)) }, { once: true })

                    // try to load from cache
                    tf.loadGraphModel(`indexeddb://${file}`)
                        .then(model => (this._progress.set(1), model))

                        // in case it fails, it's because the model was not cached
                        // so we must load from the url  
                        .catch(() => {
                            const downloadPromise = tf.loadGraphModel(file, { onProgress })
                            if (this.#shouldCache) {
                                downloadPromise.then(model => model.save(`indexeddb://${file}`))
                            }
                            return downloadPromise
                        })
                        .then(model => resolve({ model, ckpt: this.#checkpoint }))
                        .catch(reject)
                })

                return promise
            }

            get targetDomain() {
                return this.#checkpoint.target
            }
        }
    }

    static get GenerateLocallyTask() {
        return class GenerateLocallyTask extends AsyncTask {
            #generator
            #inputs
            #config
            #debug
            #tf

            constructor(model, generator, tf, sourceDomain, targetDomain, backend = 'webgl', thread = 'ui', waitOn = [], debug = false) {
                super([model.loaded, ...waitOn])
                this.#inputs = model.config.inputs
                this.#config = model.config
                this.#debug = debug
                this.#generator = generator
                this.#tf = tf

                this.sourceDomain = sourceDomain
                this.targetDomain = targetDomain
            }

            assembleInputs(sourceData) {
                const inputs = []
                const tf = this.#tf
                for (let inputDescription of this.#inputs) {
                    switch (inputDescription) {
                        case 'sourceImage':
                            {
                                const sourceImage = tf.cast(tf.browser.fromPixels(sourceData, 4), 'float32')
                                const offset = tf.scalar(127.5)
                                const normalizedSourceData = tf.expandDims(sourceImage.div(offset).sub(tf.scalar(1)), 0)
                                inputs.push(normalizedSourceData)
                            }
                            break
                            
                        case 'sourceImages':
                            {
                                const sourceImages = sourceData.map(img => tf.cast(tf.browser.fromPixels(img, 4), 'float32'))
                                const offset = tf.scalar(127.5)
                                const normalizedSourceData = sourceImages.map(img => tf.expandDims(img.div(offset).sub(tf.scalar(1)), 0))
                                const batchedSourceData = tf.transpose(tf.stack(normalizedSourceData), [1, 0, 2, 3, 4])
                                inputs.push(batchedSourceData)
                            }
                            break

                        case 'targetDomain-channelized':
                            {
                                const domainsInOrder = ['back', 'left', 'front', 'right']
                                const targetIndex = domainsInOrder.indexOf(this.targetDomain) // e.g., 3
                                const oneHotTargetIndex = tf.oneHot([targetIndex], domainsInOrder.length) // e.g., [0, 0, 0, 1]
                                const channelizedTargetIndex = tf.tile(tf.expandDims(oneHotTargetIndex, 0), [64, 64, 1])
                                inputs.push(channelizedTargetIndex)
                            }
                            break

                        case 'targetDomain':
                            {
                                const domainsInOrder = ['back', 'left', 'front', 'right']
                                const targetIndex = domainsInOrder.indexOf(this.targetDomain) // e.g., 3
                                inputs.push(tf.tensor2d([targetIndex], [1, 1]))
                            }
                            break

                        case 'sourceDomain':
                            {
                                const domainsInOrder = ['back', 'left', 'front', 'right']
                                const sourceIndex = domainsInOrder.indexOf(this.sourceDomain) // e.g., 3
                                inputs.push(tf.tensor2d([sourceIndex], [1, 1]))
                            }
                            break
                    }
                }

                // const input = tf.concat(inputs, -1)
                // return { input, channels: input.shape.at(-1) }
                return inputs
            }

            async _execute(signal, sourceData) {
                const isDebug = this.#debug
                const generator = this.#generator
                const tf = this.#tf
                const outputs = tf.tidy(() => {
                    // const { input, channels } = this.assembleInputs(tf.cast(tf.browser.fromPixels(sourceCanvasEl, 4), 'float32'))
                    // const batchedSourceData = input.reshape([1, 64, 64, channels])

                    // const t0 = tf.util.now();
                    // const targetData = generator.predict(batchedSourceData, { training: true })
                    const inputs = this.assembleInputs(sourceData)
                    const t0 = tf.util.now()
                    const debuggingOutputNames = isDebug ? this.#config.debugInfo.outputNodeNames : null
                    const outputs = generator.execute(inputs, debuggingOutputNames)
                    const ellapsed = tf.util.now() - t0;
                    console.info(`Took ${ellapsed.toFixed(2)}ms to predict`)

                    const outputImage = isDebug ? outputs[0] : outputs
                    const outputImageNormalized = outputImage.div(2).add(0.5).reshape([64, 64, 4])

                    if (isDebug) {
                        const partialOutputs = Object.fromEntries(debuggingOutputNames.map((name, i) => [name, outputs[i]]))
                        return [outputImageNormalized, partialOutputs]
                    } else {
                        return [outputImageNormalized]
                    }
                })

                const [generatedImage, debuggingPartialOutputs] = outputs
                const pixels = await detensorize(generatedImage)
                generatedImage.dispose()
                this.progress.set(1)

                return [pixels, debuggingPartialOutputs]
            }

            async cancel() {
                throw new Error('Not yet implemented "cancel" method on GenerateLocallyTask')
            }
        }
    }

    static async checkIfModelIsCached(modelName) {
        const savedModels = await tf.io.listModels()
        return Object.keys(savedModels).some(key => key.includes(modelName))
    }
        
}

class LocalGenerator extends GeneratorProxy {
    #localModel
    #tfModel
    #tf

    constructor(localModel, tfModel, tf) {
        super()
        this.#localModel = localModel
        this.#tfModel = tfModel
        this.#tf = tf
    }

    createGenerationTask(sourceDomain, targetDomain, debug = false) {
        return new LocalModel.GenerateLocallyTask(this.#localModel, this.#tfModel, this.#tf, sourceDomain, targetDomain, 'webgl', 'ui', [], debug)
    }
}
