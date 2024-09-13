import { LocalModel } from './local-model.js'
import { DatasetLoader } from './dataset-loader.js'
import { allowDrag } from './drag-and-drop.js'
import { ProgressBar } from './progress-bar.js'

// loads the dataset
const datasetDisplayEl = document.querySelector('#dataset-display')
const datasetChooserEl = datasetDisplayEl.querySelector('select')
const exampleTemplateEl = document.querySelector('#paired-example-template')
const dataset = new DatasetLoader(datasetDisplayEl, datasetChooserEl, exampleTemplateEl)
console.time('initialize-dataset')
dataset.initialize()
console.timeEnd('initialize-dataset')


// configures draggable things: an individual pose and a whole paired example
const draggablePose = allowDrag('.example-cell', {
    draggedData(e) {
        const draggedImage = e.target.querySelector('.example-image')
        return draggedImage
    }
})

const draggableExample = allowDrag('.paired-example', {
    draggedData(e) {
        const draggedExampleEl = e.target
        return {
            back: draggedExampleEl.querySelector('.example-image.facing-back'),
            left: draggedExampleEl.querySelector('.example-image.facing-left'),
            front: draggedExampleEl.querySelector('.example-image.facing-front'),
            right: draggedExampleEl.querySelector('.example-image.facing-right')
        }
    }
})


// configures droppable regions
draggablePose.dropOn('#input-images > g', (e, draggedData, droppedData) => {
    const imageContainerEl = e.target.closest('.input-image-container')
    delete imageContainerEl.dataset.cleared
    const inputImageEl = imageContainerEl.querySelector('.input-image')
    const ctx = inputImageEl.getContext('2d')
    ctx.clearRect(0, 0, inputImageEl.width, inputImageEl.height)
    ctx.drawImage(draggedData, 0, 0, inputImageEl.width, inputImageEl.height)
}, {
    accept: '.example-cell',
})

draggableExample.dropOn('.input-image-container', (e, draggedData, droppedData) => {
    const diagramEl = document.querySelector('#diagram')
    const allInputImages = diagramEl.querySelectorAll('.input-image')
    for (let el of allInputImages) {
        delete el.closest('.input-image-container').dataset.cleared
        const id = el.id
        const side = id.split('-')[2]
        const ctx = el.getContext('2d')
        ctx.clearRect(0, 0, el.width, el.height)
        ctx.drawImage(draggedData[side], 0, 0, el.width, el.height)
    }
}, {
    accept: '.paired-example',
    activateAllDropzones: true
})


// configures interactions with the diagram: (1) clear an input image and (2) change the target domain
const diagramEl = document.querySelector('#diagram')
diagramEl.addEventListener('click', e => {
    // if clicked on .input-image-container elements, (1) clear the corresponding image
    if (e.target.classList.contains('input-image-container')) {
        e.target.dataset.cleared = 'true'
        const inputImageEl = e.target.querySelector('.input-image')
        inputImageEl.getContext('2d').clearRect(0, 0, inputImageEl.width, inputImageEl.height)
        
        // write (0.5, 0.5, 0.5, 0.5) color to every pixel as that's what a blank image is to the network
        // (it becomes (0, 0, 0, 0) after normalization between [-1, 1])
        const grayTensor = tf.ones([64, 64, 4]).mul(0.5)
        const grayImageData = new ImageData(grayTensor.dataSync(), 64, 64)
        inputImageEl.getContext('2d').putImageData(grayImageData, 0, 0)
    }

    // if clicked on .target-domain elements, (2) change the target domain
    if (e.target.classList.contains('target-domain-button')) {
        const allTargetDomainEls = Array.from(document.querySelectorAll('.target-domain'))
        allTargetDomainEls.forEach(el => el.querySelector('tspan').textContent = '0')
        const side = e.target.dataset.side
        const targetDomainEl = e.target.closest('g').querySelector(`#text-input-target-${side} tspan`)
        targetDomainEl.textContent = '1'
    }
})



// loads the model
const modelProgressBar = new ProgressBar('model-working', 0, false)
document.body.insertAdjacentElement('beforebegin', modelProgressBar.createDom())

const model = new LocalModel('collagan')
console.time('initialize-model')
const tasks = await model.initialize()
modelProgressBar.watchProgress(tasks.map(t => t.progress))
await Promise.allSettled(tasks.map(t => t.done))
console.timeEnd('initialize-model')

document.querySelector('#generate').addEventListener('click', async () => {
    const diagramEl = document.querySelector('#diagram')
    const sourceImages = [
        diagramEl.querySelector('#image-input-back'),
        diagramEl.querySelector('#image-input-left'),
        diagramEl.querySelector('#image-input-front'),
        diagramEl.querySelector('#image-input-right')
    ]
    const targetImageEl = document.querySelector('#output-image')

    const targetDomainEls = Array.from(document.querySelectorAll('.target-domain'))
    const targetDomain = targetDomainEls.find(el => el.querySelector('tspan').textContent === '1').dataset.side
    const sourceDomains = ['back', 'left', 'front']

    const generator = model.selectGenerator(sourceDomains, targetDomain)
    const task = generator.createGenerationTask(sourceDomains, targetDomain)
    modelProgressBar.watchProgress([task.progress])
    const content = await task.run(sourceImages)

    const { pixels, width, height } = content
    const imageData = new ImageData(pixels, width, height)
    const ctx = targetImageEl.getContext('2d')
    ctx.clearRect(0, 0, targetImageEl.width, targetImageEl.height)
    ctx.putImageData(imageData, 0, 0)
})