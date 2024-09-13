import { ComputedProgressObservable } from '../observable.js'

export class ProgressBar {
    #name
    #value
    #el
    #orientation
    #computedProgress

    constructor(name, value = 0, vertical = false) {
        this.#name = name
        this.#value = value
        this.#orientation = vertical ? 'vertical' : 'horizontal'
    }

    createDom() {
        const template = `<div class="ai-progress-bar ${this.#orientation} transition" aria-role="progressbar" aria-label="Progress of ${this.#name}"></div>`
        this.#el = document.createRange().createContextualFragment(template).firstElementChild
        return this.#el
    }

    watchProgress(observableProgresses) {
        // reset the progress value, as we're starting the task
        this.value = 0

        // a callback to update and stop watching when finished
        const updateAndStop = (value => {
            this.value = value
            if (this.value >= 1) {
                this.#computedProgress.removeListener(updateAndStop)
            }
        })

        // start watching
        this.#computedProgress = new ComputedProgressObservable(observableProgresses)
        this.#computedProgress.addListener(updateAndStop)
    }

    get value() {
        return this.#value
    }

    set value(percentage) {
        this.#value = percentage
        this.#el.classList.toggle('transition', percentage !== 0)
        setImmediate(() => this.#el.style.setProperty('--progress-bar-value', Math.min(1, Math.max(0, this.#value))))
    }
}