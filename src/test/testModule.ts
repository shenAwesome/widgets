
import { Bench, Module } from "../Bench"
import { observe } from "../observe"

function testObserve() {
  const test = observe({
    age: 1,
    addAge(num: number) {
      this.age = this.age + num
    }
  }, (model, addCleanup, changed) => {
    console.log('rendering')
    console.log(model.age)
  })

  test.addAge(100)
}

class TestModule extends Module {
  render() {
    console.log('test')
  }
}

class TestModule2 extends Module {
  deps = {
    test: null as TestModule
  }

  render() {
    console.log(this.deps.test)
    console.log(this.deps.test.config)
    console.log('test2')
  }
}

function testModule() {
  const bench = new Bench({ TestModule2, TestModule })
}


export { testModule }