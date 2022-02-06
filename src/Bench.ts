import _ from "lodash";

type Action = () => void

class Module<T = any, C = any>{

    id: string
    state = {} as T
    config = {} as C
    deps = {} as { [key: string]: Module }
    bench: Bench

    private _listeners = [] as Action[]

    private _lastRendered = {
        state: {} as T,
        cleanups: [] as Action[],
        cleanups_changed: {} as { [key: string]: Action }
    }

    constructor() {
        this.doRender = _.debounce(this.doRender, 1)
    }

    setState(change: Partial<T>) {
        Object.assign(this.state, change)
        this.doRender()
    }

    onChange(action: Action) {
        const { _listeners: listeners } = this
        const listener = () => action()
        listeners.push(listener)
        return {
            remove: () => {
                this._listeners = listeners.filter(l => l !== listener)
            }
        }
    }

    private doRender() {
        const lastRendered = this._lastRendered,
            { state } = this

        let rendering = true
        function changed(deps: (keyof T)[], action: () => Action | void) {
            if (!rendering) {
                console.error('changed() called outside of rendering')
                return
            }
            const cleanups = lastRendered.cleanups_changed,
                key = deps.join('_'),
                depsHasChanged = deps.some(key => lastRendered.state[key] != state[key]);
            if (depsHasChanged) {
                if (cleanups[key]) cleanups[key]()
                cleanups[key] = action() || null
            }
        }
        function addCleanup(remover: Action) {
            if (!rendering) {
                console.error('addCleanup() called outside of rendering')
                return
            }
            lastRendered.cleanups.push(remover)
        }
        lastRendered.cleanups.forEach(r => r())
        lastRendered.cleanups.length = 0
        const ret = this.render(state, changed, addCleanup)
        if (ret) addCleanup(ret)
        lastRendered.state = { ...state }
        this._listeners.forEach(l => l())
        rendering = false
    }

    protected render(
        state: T,
        changed: (deps: (keyof T)[], action: () => Action | void) => void,
        addCleanup: (remover: Action) => void
    ): Action | void {
        throw 'to be implemented'
    }

    async start() {

    }
}



class Bench {

    modules = {} as { [id: string]: Module }

    constructor(modules: { [key: string]: new () => Module }) {
        _.forEach(modules, (Cls, name) => {
            const id = this.createID(name)
            const m = new Cls, bench = this
            this.modules[id] = Object.assign(m, { id, bench })
        })
        console.info("bench is starting :" + this.moduleIds.join(','))
        this.start()
    }

    get moduleIds() {
        return Object.keys(this.modules)
    }

    private createID(name: string) {
        return _.camelCase(name.replace('Module', ''))
    }

    async start() {
        const _config = JSON.parse(await (await fetch('./bench.json')).text()),
            allConfig = {} as { [key: string]: any }
        _.forEach(_config, (value, key) => {
            allConfig[key.toUpperCase()] = value
        })
        //autowire module
        const { modules } = this
        const sorted = [] as Module[], toSort = _.values(modules)
        while (toSort.length > 0) {
            const ready = toSort.filter(m => {
                return Object.keys(m.deps)
                    .every(id => sorted.some(s => s.id == id))
            })
            if (ready.length == 0) break
            sorted.push(...ready)
            _.pullAll(toSort, ready)
        }
        sorted.push(...toSort)//drawback
        sorted.forEach(m => {
            Object.keys(m.deps).forEach(id => {
                m.deps[id] = modules[id]
            })
        })
        //start
        for (const m of sorted) {
            const config = allConfig[m.id.toUpperCase()]
            Object.assign(m, { config })
            await m.start()
        }
        //first render
        for (const m of sorted) m.setState({})
    }
}

export { Module, Bench }

