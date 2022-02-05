
function debounce<T extends Function>(func: T, timeout = 1) {
    let timer = -1;
    function newFn(...args: any[]) {
        clearTimeout(timer)
        timer = window.setTimeout(() => { func.apply(null, args) }, timeout);
    }
    return (newFn as any) as T
}

type Action = () => void

function observe<T>(
    model: T,
    renderer: (
        state: T,
        setState: (state: Partial<T>) => void,
        addRemover: (remover: Action) => void,
        changed: (onChange: () => Action | void, deps?: (keyof T)[]) => void
    ) => Action | void
) {
    const lastRendered = {
        state: {} as T,
        removers: [] as Action[],
        removers_changed: {} as { [key: string]: Action }
    }

    function setState(change: Partial<T>) {
        Object.assign(model, change)
        doRender()
    }

    function changed(onChange: () => Action | void, deps: (keyof T)[]) {
        const removers = lastRendered.removers_changed,
            key = deps.join(','),
            remover = removers[key]
        if (remover) remover()
        const depsHasChanged = deps.some(key => lastRendered.state[key] != model[key])
        if (depsHasChanged) {
            const ret = onChange()
            removers[key] = ret || null
        }
    }

    function addRemover(remover: Action) {
        lastRendered.removers.push(remover)
    }

    const doRender = debounce(() => {
        lastRendered.removers.forEach(r => r())
        lastRendered.removers.length = 0
        const ret = renderer(model, setState, addRemover, changed)
        if (ret) addRemover(ret)
        lastRendered.state = { ...model }
    })

    return {
        state: model,
        setState
    }
}

observe({
    age: 1
}, (state, setState, addRemover, changed) => {

    changed(() => {

    }, ["age"])

    setState({
        age: 1
    })
})

export { observe }

