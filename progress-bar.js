import { ComputedProgressObservable } from './observable.js'

export class ProgressBar {
    #name
    #value
    #startingValue
    #el
    #orientation
    #computedProgress

    constructor(name, startingValue = 0, vertical = false) {
        this.#name = name
        this.#startingValue = this.#value = startingValue
        this.#orientation = vertical ? 'vertical' : 'horizontal'
    }

    /**
     * Creates an HTML element to hold the progress bar (div with class 'ai-progress-bar' and ARIA labels)
     * @returns the created element
     */
    createDom() {
        const template = `<div class="ai-progress-bar ${this.#orientation} transition" aria-role="progressbar" aria-label="Progress of ${this.#name}"></div>`
        this.#el = document.createRange().createContextualFragment(template).firstElementChild
        return this.#el
    }

    /**
     * Attaches an existing DOM element to the progress bar
     * @param {*} el any HTML element that will have a --progress-bar-value CSS variable set between 0 and 1
     * @returns the created element
     */
    attachDom(el) {
        this.#el = el
        return this.#el
    }

    watchProgress(observableProgresses) {
        // reset the progress value, as we're starting the task
        this.value = this.#startingValue

        // a callback to update and stop watching when finished
        const updateAndStop = (value => {
            this.value = value
            if (this.value >= 1) {
                this.#computedProgress.removeListener(updateAndStop)
                this.#el.classList.remove('transition')
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
        setImmediate(() => this.#el.style.setProperty('--progress-bar-value', Math.min(1, Math.max(this.#startingValue, this.#value))))
    }
}