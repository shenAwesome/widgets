
function debounce<F extends (...params: any[]) => void>(fn: F, delay = 1) {
    let timeoutID: number = null;
    return function (this: void, ...args: any[]) {
        clearTimeout(timeoutID);
        timeoutID = window.setTimeout(() => fn.apply(this, args), delay);
    } as F;
}

type Action = () => void

class Module<T>{
    state = {} as T

    private _listeners = [] as Action[]

    private _lastRendered = {
        state: {} as T,
        cleanups: [] as Action[],
        cleanups_changed: {} as { [key: string]: Action }
    }

    constructor() {
        this.doRender = debounce(this.doRender)
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
}

export { Module }

