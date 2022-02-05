
class XY {
    constructor(public readonly x: number, public readonly y: number) {

    }

    distance(b: XY) {
        const a = this
        const dx = a.x - b.x,
            dy = a.y - b.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    difference(xy2: XY) {
        const { x, y } = this
        return new XY(xy2.x - x, xy2.y - y)
    }
}


function getXY(evt: PointerEvent) {
    return new XY(evt.screenX, evt.screenY)
}

class DraggerProps {
    onDragStart(): void | any {

    }
    onDragMove(change: XY, startRect: any) {

    }
    onDragEnd() {

    }
    className = ''
}

class Dragger {
    element = document.createElement('div')
    start = {
        xy: null as XY,
        data: null as any
    }
    isDragging = false

    props = new DraggerProps

    get parent() {
        return this.element.parentElement
    }

    constructor(props: Partial<DraggerProps>, appendTo?: string | HTMLElement) {
        this.pointermove = this.pointermove.bind(this)
        this.pointerup = this.pointerup.bind(this)

        Object.assign(this.props, props)
        let clsName = 'Dragger'
        if (this.props.className) clsName += ' ' + this.props.className

        const { element, start } = this
        element.setAttribute('draggable', 'false')
        element.addEventListener('pointerdown', (evt) => {
            this.isDragging = false
            start.data = element.getBoundingClientRect()
            start.xy = getXY(evt)
            window.addEventListener('pointermove', this.pointermove)
            window.addEventListener('pointerup', this.pointerup)
            evt.preventDefault()
        })

        element.className = clsName
        if (appendTo) {
            if (!(appendTo instanceof HTMLElement)) {
                appendTo = document.querySelector(appendTo) as HTMLElement
            }
            appendTo.append(element)
        }
    }

    appendTo(container: HTMLElement) {
        container.appendChild(this.element)
    }

    pointermove(evt: PointerEvent) {
        if (!this.isDragging) {
            const d = this.start.xy.distance(getXY(evt))
            if (d > 5) {//drag start
                this.isDragging = true
                const data = this.props.onDragStart()
                if (data) this.start.data = data
            }
        }
        if (this.isDragging) {
            const change = this.start.xy.difference(getXY(evt))
            this.props.onDragMove(change, this.start.data)
        }
    }

    pointerup() {
        if (this.isDragging) {
            this.props.onDragEnd()
            this.isDragging = false
        }
        window.removeEventListener('pointermove', this.pointermove)
        window.removeEventListener('pointerup', this.pointerup)
    }
}

type ResizerType = 'left' | 'top' | 'right' | 'bottom'

const position = {
    left: 0, top: 0,
    width: 0, height: 0,
    isAbsolute: false
}

class Resizer {
    constructor(target: HTMLElement, type: [ResizerType], onChange = (posi: typeof position) => { }) {

        function readStyle() {
            const style = window.getComputedStyle(target)
            position.left = parseInt(style.left)
            position.top = parseInt(style.top)
            position.width = parseInt(style.width)
            position.height = parseInt(style.height)
            position.isAbsolute = style.position == 'absolute'
            return { ...position }
        }

        type.forEach(dir => {
            const dragger = new Dragger({
                onDragStart: () => {
                    target.classList.add('NoTransition')
                    readStyle()
                },
                onDragMove: (change) => {
                    const { style } = target
                    switch (dir) {
                        case 'left':
                            style.width = (position.width - change.x) + 'px'
                            if (position.isAbsolute) style.left = (position.left + change.x) + 'px'
                            break;
                        case 'right':
                            style.width = (position.width + change.x) + 'px'
                            break;
                    }
                },
                onDragEnd: () => {
                    target.classList.remove('NoTransition')
                    onChange(readStyle())
                },
                className: dir
            }).appendTo(target)
        })
    }
}

class Timer {
    isPaused = false
    pause(timeout: number) {
        this.isPaused = true
        window.setTimeout(() => {
            this.isPaused = false
        }, timeout);
    }
}

export { Dragger, Resizer, Timer }