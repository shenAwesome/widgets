
function debounce<T extends Function>(func: T, timeout = 1) {
    let timer = -1;
    function newFn(...args: any[]) {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => { func.apply(null, args) }, timeout);
    }
    return (newFn as any) as T
}

type Action = () => void

/**
 * observe change to model
 * @param model 
 * @param renderer 
 * @returns 
 */
function observe<T>(model: T, renderer: (
    model: T & { set: (state: Partial<T>) => void },
    addCleanup: (cleanup: Action) => void,
    changed: (deps: (keyof T)[], onChange: () => Action | void) => void
) => Action | void) {

    const lastRendered = {
        state: {} as T,
        cleanups: [] as Action[],
        cleanups_changed: {} as { [key: string]: Action }
    }

    function setState(change: Partial<T>) {
        if (isRendering) {
            console.error('setState() called during rendering')
            return
        }
        Object.assign(model, change)
        doRender()
    }

    function changed(deps: (keyof T)[], onChange: () => Action | void) {
        if (!isRendering) {
            console.error('changed() called outside of rendering')
            return
        }
        const cleanups = lastRendered.cleanups_changed,
            key = deps.join('_'),
            depsHasChanged = deps.some(key => lastRendered.state[key] != model[key]);
        if (depsHasChanged) {
            if (cleanups[key]) cleanups[key]()
            cleanups[key] = onChange() || null
        }
    }

    function addCleanup(remover: Action) {
        if (!isRendering) {
            console.error('addCleanup() called outside of rendering')
            return
        }
        lastRendered.cleanups.push(remover)
    }

    let isRendering = false

    const doRender = debounce(() => {
        isRendering = true
        lastRendered.cleanups.forEach(r => r())
        lastRendered.cleanups.length = 0
        const ret = renderer(enhanced, addCleanup, changed)
        if (ret) addCleanup(ret)
        lastRendered.state = { ...model }
        isRendering = false
    }, 1)

    const enhanced = {
        set: setState
    } as (T & { set: (state: Partial<T>) => void })

    Object.keys(model).forEach(key => {
        const prop = key as keyof T,
            get = () => model[prop],
            set = (val: any) => {
                const change = { prop: val } as any
                if (key.startsWith('_')) {//doesn't trigger render for private props
                    Object.assign(model, change)
                } else {
                    setState(change)
                }
            }
        Object.defineProperty(enhanced, prop, { get, set })
    })

    setState({})//init

    return enhanced
}

const test = observe({
    age: 1
}, (model, addCleanup, changed) => {
    changed(["age"], () => {

    })
    //dont call set in render
    /*
    model.set({
        age: 1
    })
    model.age = 100
    */
})

export { observe }

