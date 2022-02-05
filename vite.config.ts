import path from 'path'
import { defineConfig } from 'vite'

const config = defineConfig({
    base: '',
    plugins: [],
    build: {
        /*
        lib: {
            entry: path.resolve(__dirname, 'src/SElement.ts'),
            name: 'Swidgets',
            fileName: (format) => `swidgets.${format}.js`
        }*/
    }
})

export default config