import "./SElement.scss"
import $, { Cash } from "cash-dom"
import { Dragger, Timer } from "./Dragger"

type CleanUpFn = () => void

/**
 * base class for creating a custom tag.
 * to develope a custom tag:
 * 1) Declare a new Class which expands SElement
 * 2) Add properites. Any assignment to properties will trigger render(). When provided, attributes will be used as props' initial values. 
 * 3) Impelment render()
 * 4) Use define() to register the class in DOM, for example: SElement.define({ PopUp })
 * 5) Use new tag in HTML with 's-' as prefix, for example: <x-popup .../>
 * 6) If setAttribute() needs to be supported, implement observedAttributes, 
 *    for example: static get observedAttributes() { return ['text']; }.  
 */
class SElement extends HTMLElement {
    readonly root = $('<div class="root"/>')
    readonly props = [] as string[]
    readonly initChildren = [] as Element[]

    name = ''

    private readonly _state = {} as { [key: string]: any }
    private readonly _lastRendered = {
        state: {} as { [key: string]: any },
        cleanUp: null as CleanUpFn
    }

    private _baseProps = [] as string[]
    constructor() {
        super();
        this.initChildren = Array.from(this.children)
        this._baseProps = Object.keys(this)
    }

    connectedCallback() {
        const baseProps = this._baseProps
        const props = Object.keys(this).filter(k => !baseProps.includes(k) && !k.startsWith('_'))
        this.props.push(...props)
        this.initialize()
        $(this).empty().append(this.root).addClass('SElement')
        this.init(this.root)
        this.refresh()
    }

    attributeChangedCallback() {
        this.applyAttr()
    }

    private initialize() {
        this.applyAttr()
        Object.assign(this, this.validate())
        const state = this._state
        let timer = -1
        const propChanged = () => {
            const update = this.validate()
            Object.assign(state, update)
            window.clearTimeout(timer)
            timer = window.setTimeout(() => this.refresh(false), 1)
        }
        //trigger rendering on any prop change, based on props
        for (const prop of this.props) {
            state[prop] = (this as any)[prop]
            Object.defineProperty(this, prop, {
                get: () => state[prop],
                set: val => {
                    state[prop] = val
                    propChanged()
                }
            })
        }
    }

    /**
     * copy html attributes to object properties
     */
    private applyAttr() {
        const newValues = {} as { [key: string]: any }
        for (const prop of ['name', ...this.props]) {
            let attrValue = this.getAttribute(prop)
            if (attrValue !== null) {
                attrValue = attrValue.toString()
                const currentVal = (this as any)[prop]
                let val: any = attrValue
                if (typeof currentVal === 'number') {
                    val = parseFloat(attrValue)
                }
                newValues[prop] = val
            }
        }
        Object.assign(this, newValues)
    }

    /**
     * should only be used inside render(), tests if a property has been changed since last rendering. 
     * this is to help skipping heavy DOM task when possible. an example is selection on a tree, 
     * the whole tree doesn't need to be re rendered every time
     * @param propName 
     * @returns 
     */
    protected hasChanged(propName: string) {
        return this._state[propName] != this._lastRendered.state[propName]
    }

    /**
     * invoke render() programmatically, should only be used when property assignment is not feasible  
     * @param purge when true, hasChanged() will always return true during rendering
     */
    protected refresh(purge = true) {
        const ls = this._lastRendered
        if (ls.cleanUp) ls.cleanUp()
        if (purge) ls.state = {}
        ls.cleanUp = this.render(this.root) as any
        ls.state = { ...this._state }
    }

    /**
    * to be impelmented in sub class.  
    * only be excuted once
    */
    protected init(root: Cash) {

    }

    protected validate(): any {

    }

    /**
     * to be impelmented in sub class.  
     * Any assignment to property (for example: widget.size=123) will trigger render().
     * render() should never be called directly. 
     * use refresh() to force a rendering when necessary.
     */
    protected render(root: Cash): void | CleanUpFn {
        console.error('render() is not implemented');
    }

    static tags: string[] = []

    /**
     * define a tag, should be used in subclass module
     * @param classes 
     */
    static define(classes: { [key: string]: CustomElementConstructor }) {
        for (const [name, cls] of Object.entries(classes)) {
            const tag = `s-${name.toLowerCase()}`
            customElements.define(tag, cls);
            SElement.tags.push(tag)
        }
    }

    focus(): void {
        const input = this.root.find('input').get(0) as HTMLInputElement
        if (input) {
            input.select()
        }
    }

    get(key: string) {
        return this._state[key]
    }

    fireInput() {
        $(this).trigger('input', this.get('value'))
    }

    fireChange() {
        this.fireInput()
        $(this).trigger('change', this.get('value'))
    }
}



class Range extends SElement {
    value = 0
    min = 0
    max = 100
    step = 1

    private _timer = new Timer()

    init(root: Cash) {
        root.empty()
        root.html(`   
            <input type='text' class='dumb'>  
            <div class='slider fill'>
                <div class='bar'>
                    <div class='progress'></div>
                    <div class='ruler'></div>
                </div> 
                <div class='track'>
                    <div class='knob'></div> 
                </div>
            </div>
            <input type='number'>  
        `)
        //todo use a js solution
        root.find(`input`).on('input', evt => {
            let value = parseFloat(evt.target.value)
            if (isNaN(value)) value = 0
            this.value = value
            this.fireInput()
            evt.stopPropagation()
        })
        root.find(`input`).on('change', evt => {
            evt.stopPropagation()
            this.fireChange()
        })
        root.find('.slider').on('click', evt => {
            if (this._timer.isPaused) return
            const { left, width } = root.find('.ruler').get(0).getBoundingClientRect(),
                span = evt.clientX - left,
                { min, max } = this,
                value = min + (max - min) * span / width
            this.value = value
            this.fireChange()
        })
        new Dragger({
            onDragStart: () => {
                const width = root.find('.track').width(),
                    { value } = this
                return { width, value }
            },
            onDragMove: (change, data) => {
                const changePercent = change.x / data.width
                this.value = data.value + changePercent * (this.max - this.min)
                this.fireInput()
            },
            onDragEnd: () => {
                this.fireChange()
                //blocking click
                this._timer.pause(100)
            }
        }).appendTo(root.find('.knob').get(0))
    }

    validate() {
        let { value, min, max, step } = this
        if (min >= max) max = min + 1
        if (isNaN(value)) value = 0
        //find nearest
        value = nearest(value, min, max, step)
        value = fixRounding(value, 5)
        return { value, min, max }
    }

    render(root: Cash) {
        const { min, max, step, value } = this
        const percentage = Math.round((value - min) * 100 / (max - min)) + '%'
        root.find('.knob').css('left', percentage)
        root.find('.progress').css('width', percentage)
        root.find(`[type='number']`).prop({ value, min, max, step })
    }
}

function clamp(num: number, min: number, max: number) {
    return Math.max(min, Math.min(num, max));
}

function fixRounding(value: number, precision: number) {
    var power = Math.pow(10, precision || 0);
    return Math.round(value * power) / power;
}

function nearest(value: number, min: number, max: number, step: number) {
    let position = clamp((value - min) / (max - min), 0, 1)
    value = min + position * (max - min)
    value = step * Math.floor((value - min) / step) + min
    return value
}

SElement.define({ Range })


class Color extends SElement {
    value = 0
    min = 0
    max = 100
    step = 1
    init(root: Cash) {
        root.empty()
        root.html(`  
            <input type='text' class='fill'>
            <input type='color'> 
        `)
        root.find(`input`).on('input', evt => {
            let value = parseFloat(evt.target.value)
            this.value = value
            evt.stopPropagation()
            $(this).trigger('input', this.value)
        })
        root.find(`input`).on('change', evt => {
            evt.stopPropagation()
            $(this).trigger('change', this.value)
        })
    }
    render(root: Cash) {
        const { min, max, step, value } = this
        root.find(`[type='range']`).prop({
            min, max, step, value
        })
        root.find(`[type='number']`).prop({ value })
    }
}

SElement.define({ Color })

export { SElement }