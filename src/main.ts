import { testModule } from "./test/testModule"
import { Test } from "./Widget"



//testModule()

const test = new Test().set({
    name: 'shenzhijie'
})

Object.assign(window, { test })

