
import $ from "cash-dom"
import { SElement } from './SElement';

class PopUp extends SElement {
  static get observedAttributes() { return ['text']; }

  text = 'abc'
  age = 'abc'

  count = 1

  render() {
    const { text, age, count } = this
    this.root.html(text + ',' + age + count)
    $('<button >click</button>').appendTo(this.root).on('click', () => this.click())

    return () => {

    }
  }

  click() {
    this.count++
  }

}

SElement.define({ PopUp })

const app = document.querySelector<HTMLDivElement>('#app')
app.innerHTML = `<div> 
  <span>abc</span> 
  <s-range min=0 max=100 step=30 ></s-range> 
  <span>abc</span>
  <s-color></s-color> 
  <span>abc</span>
  <s-color></s-color> 
</div>`

$(app).find('s-range').on('change', (e) => {
  console.log(e.target.value)
})