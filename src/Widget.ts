import _ from "lodash"

class Cache {
    cache = {} as any
    async get<T>(key: string, factory: () => Promise<T>) {
        let value = this.cache[key]
        if (value == null) {
            value = await factory()
            this.cache[key] = value
        }
        return value
    }
    clear() {
        this.cache = {}
    }
}

type Action = () => void

abstract class Widget {
    private _cache = new Cache
    private _changeHandlers = [] as Function[]
    private _cleanups = [] as Action[]
    private _isRendering = false
    private _lastRenderedState = {} as any
    private readonly _state = {} as any
    public className = 'Widget'
    public readonly root = document.createElement('div')

    constructor() {
        this.changed = this.changed.bind(this)
        this.addCleanup = this.addCleanup.bind(this)
        const excluded = Object.keys(this)
        setTimeout(() => this.initComponent(excluded))
        this.requestRender = _.debounce(this.requestRender, 20)
    }

    private _doCleanup() {
        const cleanups = this._cleanups
        cleanups.forEach(c => c())
        cleanups.length = 0
    }

    private async initComponent(excluded: string[]) {
        this.root.classList.add(this.className)
        const keys = Object.keys(this).filter(k => !(
            k.startsWith('_') || excluded.includes(k) || (this as any)[k] instanceof Function
        ))
        const self = this,
            { root, _state: state } = this
        await this.init(root)
        //changing property triggers render()
        keys.forEach(key => {
            state[key] = (this as any)[key]
            Object.defineProperty(this, key, {
                get() { return state[key] },
                set(newValue) {
                    state[key] = newValue
                    if (self._isRendering) {
                        throw `property '${key}' changed inside render()`
                    }
                    self.requestRender()
                }
            })
        })
        this.requestRender()
    }

    private onChange(handler: (obj: typeof this) => void) {
        const handlers = this._changeHandlers
        handlers.push(handler)
        return {
            remove: () => _.pull(handlers, handler)
        }
    }

    /**
     * can only be called in render() 
     */
    protected addCleanup(action: Action) {
        if (!this._isRendering) throw "addCleanup can only be called in render()"
        if (action) this._cleanups.push(action)
    }

    /**
     * can only be called in render() 
     */
    protected changed(props: [keyof this], action: Action) {
        if (!this._isRendering) throw "changed can only be called in render()"
        const hasChanged = (key: keyof this) => {
            return this._lastRenderedState[key] !== this._state[key]
        }
        if (props.some(p => hasChanged(p))) {
            action()
        }
    }

    /**
     * Empty method called at the next time frame of constructor() , child class can override it if needed.
     * it is any async method, can be used to delay render
     * render() won't be called until init finishes
     * @param root 
     */
    protected async init(root: HTMLDivElement) { }

    protected async memo<T>(key: string, factory: () => Promise<T>) {
        return this._cache.get(key, factory) as Promise<T>
    }

    protected async memoClear() {
        return this._cache.clear()
    }

    /**
     * called when any property is set (20ms debounced), this method should be implemented by child class.
     * render() can return a cleanup function to be called before next render(), or before remove().
     * utilize onChange() and addCleanup() in render()
     * @param root 
     */
    protected abstract render(root: HTMLDivElement): Action | void

    protected requestRender() {
        const hasChange = Object.entries(this._state).some(
            ([key, val]) => val !== this._lastRenderedState[key])
        if (!hasChange) return

        this._isRendering = true
        this._doCleanup()
        this.addCleanup(this.render(this.root) as any)
        this._lastRenderedState = { ...this._state }
        this._isRendering = false
        this._changeHandlers.forEach(c => c(this))
    }

    /**
     * append to a DOM node
     * @param container 
     */
    public appendTo(container: HTMLElement | string) {
        if (!(container instanceof HTMLElement)) {
            container = document.querySelector(container) as HTMLElement
        }
        container.appendChild(this.root)
    }

    /**
     * remove itself from DOM tree
     */
    public remove() {
        //this._doCleanup()//really needed?
        this.root.remove()
    }

    /**
    * helper method to set property
    * @param properties 
    */
    public set(properties: Partial<this>) {
        Object.assign(this, properties)
        return this
    }
}


class Test extends Widget {
    public age = 100
    public className = 'TestWidget'
    public name = 'haha'

    protected async init(root: HTMLDivElement) {
        console.log('init', this.name)
    }

    protected render(root: HTMLDivElement): void | Action {
        const { changed, addCleanup, name, age } = this
        changed(['name'], () => {
            console.log(name)
        })
        changed(['age'], () => {
            console.log(age)
        })
    }
}

export { Widget, Test }