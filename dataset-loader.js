const DATASET_SIZES = {
    'tiny-hero': 136,
    'rpg-maker-2k': 32,
    'rpg-maker-xp': 44,
    'rpg-maker-vx': 61
}

export class DatasetLoader {
    #displayEl
    #examplesEl
    #chooserEl
    #exampleTemplateEl

    constructor(displayEl, chooserEl, exampleTemplateEl) {
        this.#displayEl = displayEl
        this.#examplesEl = displayEl.querySelector('#example-list')
        this.#chooserEl = chooserEl
        this.#exampleTemplateEl = exampleTemplateEl

        this.initialize = this.initialize.bind(this)
        this.#chooserEl.addEventListener('change', this.initialize)
    }

    initialize() {
        // cleans up the list of examples
        this.#examplesEl.innerHTML = ''
        this.urls = []

        // loads the dataset using the paired example template
        const datasetSize = DATASET_SIZES[this.datasetName]
        for (let i = 0; i < datasetSize; i++) {
            const url = {
                back: `./datasets/${this.datasetName}/test/0-back/${i}.png`,
                left: `./datasets/${this.datasetName}/test/1-left/${i}.png`,
                front: `./datasets/${this.datasetName}/test/2-front/${i}.png`,
                right: `./datasets/${this.datasetName}/test/3-right/${i}.png`
            }
            this.urls.push(url)
            const exampleEl = this.#exampleTemplateEl.content.cloneNode(true)
            exampleEl.querySelector('.example-image.facing-back').src = url.back
            exampleEl.querySelector('.example-image.facing-left').src = url.left
            exampleEl.querySelector('.example-image.facing-front').src = url.front
            exampleEl.querySelector('.example-image.facing-right').src = url.right
            this.#examplesEl.appendChild(exampleEl)
        }
    }

    get datasetName() {
        return this.#chooserEl.value
    }
}
