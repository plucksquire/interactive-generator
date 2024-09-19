import { LocalModel } from './local-model.js'
import { DatasetLoader } from './dataset-loader.js'
import { allowDrag } from './drag-and-drop.js'
import { ProgressBar } from './progress-bar.js'
import { detensorizeGrayscaleWithColormap } from './tf-util.js'
import { normalizeTensor } from './tf-util.js'

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


// configuration of how some diagram elements (clickable activation maps) map to partial output nodes from the model
let partialOutputs = null
const activationMapElsToDebuggableNodes = {
    // clickable activation maps of the decoder (right to left on the diagram) -> purple blocks (upsampling)
    'path610': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose_3/BiasAdd',
    'path562': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose_2/BiasAdd',
    'path514': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose_1/BiasAdd',
    'path466': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_transpose/BiasAdd',

    // clickable activation maps of the encoders (right to left on the diagram) -> red blocks (downsampling)
    'path430': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_112/Conv2D',
    'path818': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_124/Conv2D',
    'path1002': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_136/Conv2D',
    'path1178': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_148/Conv2D',

    'path378': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_109/Conv2D',
    'path766': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_121/Conv2D',
    'path950': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_133/Conv2D',
    'path1142': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_145/Conv2D',

    'path334': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_106/Conv2D',
    'path730': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_118/Conv2D',
    'path914': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_130/Conv2D',
    'path1106': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_142/Conv2D',

    'path298': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_103/Conv2D',
    'path694': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_115/Conv2D',
    'path6940': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_127/Conv2D',
    'path1062': 'StatefulPartitionedCall/CollaGANAffluentGenerator/conv2d_139/Conv2D',

    // clickable activation maps of the decoder (right to left on the diagram) -> select orange blocks
    'path1328': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_41/Relu',
    'path598': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_39/Relu',
    'path550': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_37/Relu',
    'path502': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_35/Relu',
    'path454': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_33/Relu',

    // clickable activation maps of the encoders (right to left on the diagram) -> select orange blocks
    'path410': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_7/Relu',
    'path798': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_15/Relu',
    'path982': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_23/Relu',
    'path1166': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_31/Relu',

    'path366': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_5/Relu',
    'path754': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_13/Relu',
    'path938': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_21/Relu',
    'path1130': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_29/Relu',

    'path322': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_3/Relu',
    'path718': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_11/Relu',
    'path902': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_19/Relu',
    'path1094': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_27/Relu',

    'path292': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_1/Relu',
    'path688': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_9/Relu',
    'path872': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_17/Relu',
    'path1056': 'StatefulPartitionedCall/CollaGANAffluentGenerator/re_lu_25/Relu',
}

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
        const grayTensor = tf.ones([64, 64, 4]).mul(127)
        const grayImageData = new ImageData(Uint8ClampedArray.from(grayTensor.dataSync()), 64, 64)
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

    // if clicked on clickable partial output activation maps, show the debugging modal with the corresponding activation maps
    if (e.target.classList.contains('clickable-activation-map')) {
        if (partialOutputs === null) {
            return
        }
        // gets the activation maps
        const node = activationMapElsToDebuggableNodes[e.target.id]
        const activationMap = partialOutputs[node]

        // render the activation maps on canvases (0, 1, 2, 3)
        renderActivationMapsOnCanvases(node, activationMap, 0)

        // open the popover dialog
        const dialogEl = document.querySelector('#modal-debugging')
        dialogEl.show()
    }
})

// make .modal-close buttons close their respective modals
const dialogCloseButtons = document.querySelectorAll('.modal-close')
for (let closeEl of dialogCloseButtons) {
    closeEl.addEventListener('click', e => e.target.closest('.modal').close())
}

// setup hovering on clickable partial output activation maps
const debuggableActivationMapEls = Object.keys(activationMapElsToDebuggableNodes).map(id => document.getElementById(id))
debuggableActivationMapEls.forEach(el => {
    el.classList.add('clickable-activation-map')
})

async function renderActivationMapsOnCanvases(nodeName, activationMapTensors, initialIndex = 0) {
    const [_, height, width, channels] = activationMapTensors.shape

    // saves the information of which layer we are showing and what is the initial activation map index
    const modalEl = document.querySelector('#modal-debugging')
    modalEl.dataset.initialIndex = initialIndex
    modalEl.dataset.nodeName = nodeName
    modalEl.dataset.channels = channels

    // updates the modal header with the dimensions of the activation map
    const modalHeaderEl = modalEl.querySelector('.modal-header')
    modalHeaderEl.querySelector('.modal-title').textContent = `Activation Maps (${height}x${width}x${channels})`
    
    
    const activationMapContainerEls = Array.from(document.querySelectorAll('.activation-map-container'))
    for (let i = 0; i < activationMapContainerEls.length; i++) {
        const mapIndex = (initialIndex + i) % channels

        // draws the activation map on the canvas
        const canvasEl = activationMapContainerEls[i].querySelector('.activation-map')
        const ctx = canvasEl.getContext('2d')
        canvasEl.width = width
        canvasEl.height = height
        ctx.clearRect(0, 0, width, height)

        const activationValues = await activationMapTensors.slice([0, 0, 0, mapIndex], [1, height, width, 1]).reshape([height, width])
        const { pixels } = await detensorizeGrayscaleWithColormap(activationValues)
        const imageData = new ImageData(pixels, width, height)
        ctx.putImageData(imageData, 0, 0)

        // updates the index label
        const indexLabelEl = activationMapContainerEls[i].querySelector('.activation-map-info')
        indexLabelEl.textContent = mapIndex
    }
}

function navigateActivationMaps(e) {
    const modalEl = document.querySelector('#modal-debugging')
    const initialIndex = parseInt(modalEl.dataset.initialIndex)
    const nodeName = modalEl.dataset.nodeName
    const channels = parseInt(modalEl.dataset.channels)

    const activationMapTensors = partialOutputs[nodeName]
    const direction = parseInt(e.target.dataset.direction)
    const nextInitialIndex = (initialIndex + direction + channels) % channels
    renderActivationMapsOnCanvases(nodeName, activationMapTensors, nextInitialIndex)
}

const navigateActivationMapButtonEls = document.querySelectorAll('#modal-debugging .navigate-map')
navigateActivationMapButtonEls.forEach(el => el.addEventListener('click', navigateActivationMaps))



// check if model already in cache...
const isModelCached = await LocalModel.checkIfModelIsCached('collagan')
if (isModelCached) {
    document.querySelector('#load-model > span').innerHTML = 'Load Model <small>(from cache)</small>'
}

// loads the model
document.querySelector('#load-model').addEventListener('click', async (e) => {
    const loadEl = e.currentTarget
    const loadContentEl = e.currentTarget.querySelector('span')
    loadEl.disabled = true
    loadContentEl.innerHTML = isModelCached ? 'Loading...' : 'Downloading...'
    try {
        await loadModel()
        loadContentEl.innerHTML = 'Model Loaded'
    } catch (e) {
        console.error(e)
        loadEl.disabled = false
        loadContentEl.innerHTML = 'Load Model <small>(400MB)</small>'
    }
})

async function loadModel() {
    const modelProgressBar = new ProgressBar('model-working')
    const loadProgressBar = new ProgressBar('model-loading', 0.05)
    const generateProgressBar = new ProgressBar('model-generating', 0.15)
    document.body.insertAdjacentElement('afterbegin', modelProgressBar.createDom())
    loadProgressBar.attachDom(document.querySelector('#load-model'))
    generateProgressBar.attachDom(document.querySelector('#generate'))
    
    const model = new LocalModel('collagan')
    console.time('initialize-model')
    const tasks = await model.initialize()
    modelProgressBar.watchProgress(tasks.map(t => t.progress))
    loadProgressBar.watchProgress(tasks.map(t => t.progress))
    await Promise.allSettled(tasks.map(t => t.done))
    console.timeEnd('initialize-model')
    
    document.querySelector('#generate').disabled = false
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
    
        const isDebug = true
        const generator = model.selectGenerator(sourceDomains, targetDomain)
        const task = generator.createGenerationTask(sourceDomains, targetDomain, isDebug)
        modelProgressBar.watchProgress([task.progress])
        generateProgressBar.watchProgress([task.progress])
        const output = await task.run(sourceImages)
        const content = isDebug ? output[0] : output

        const { pixels, width, height } = content
        const imageData = new ImageData(pixels, width, height)
        const ctx = targetImageEl.getContext('2d')
        ctx.clearRect(0, 0, targetImageEl.width, targetImageEl.height)
        ctx.putImageData(imageData, 0, 0)

        if (isDebug) {
            configurePartialOutputActivationMaps(output[1])
        }
    })
}

function configurePartialOutputActivationMaps(values) {
    // normalizes the values and saves them to be used later when the user clicks on the activation maps on the diagram
    // const normalizedValues = objectMap(values, v => normalize(v.dataSync()))
    let normalizedValues = {}
    for (let [key, value] of Object.entries(values)) {
        normalizedValues[key] = normalizeTensor(value)
    }

    partialOutputs = normalizedValues
    
    // makes activation maps clickable
    const activationMapEls = Object.keys(activationMapElsToDebuggableNodes).map(id => document.getElementById(id))
    activationMapEls.forEach(el => {
        el.classList.add('clickable-activation-map')
    })
}