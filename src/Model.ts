import $, { Cash } from "cash-dom"

type CleanUpFn = () => void

class Model {
    readonly props = [] as string[]
    readonly root = $('<div class="root"/>')

    private _baseProps = [] as string[]
    private readonly _state = {} as { [key: string]: any }

    constructor() {
        this._baseProps = Object.keys(this)
        window.setTimeout(() => this.init, 1)
    }

    private init() {

        const baseProps = this._baseProps
        const props = Object.keys(this).filter(k => !baseProps.includes(k) && !k.startsWith('_'))
        this.props.push(...props)

        let timer = -1
        const state = this._state
        const propChanged = () => {
            Object.assign(state, this.validate())
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

    validate() {

    }

    private readonly _lastRendered = {
        state: {} as { [key: string]: any },
        cleanUp: null as CleanUpFn
    }

    protected refresh(purge = true) {
        const ls = this._lastRendered
        if (ls.cleanUp) ls.cleanUp()
        if (purge) ls.state = {}
        ls.cleanUp = this.render(this.root) as any
        ls.state = { ...this._state }
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

}


export { Model }

