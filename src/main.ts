import { testModule } from "./test/testModule"
import { Test } from "./Widget"



//testModule()

const test = new Test().set({
    name: 'shenzhijie'
})

test.appendTo('body')

Object.assign(window, { test })

