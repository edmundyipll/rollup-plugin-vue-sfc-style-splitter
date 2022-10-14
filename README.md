# rollup-plugin-vue-sfc-style-splitter
A rollup plugin for splitting style blocks in Vue SFC into raw style files when bundling

# Background

## Issue
When creating a vue component library for my personal use, I created numbers of `scss` style modules with configurable [variables](https://sass-lang.com/documentation/variables#default-values). But then I found that the default behavior of vitejs `library` mode + [@vitejs/plugin-vue](https://github.com/vitejs/vite/tree/main/packages/plugin-vue#vitejsplugin-vue) can only bundle all the Vue SFCs into a single output file. Which means that the variables in my style modules will not be able to be configured from my other projects.

## Idea
After some hours of digging, I still could not find anything related to this issue and I finally decided to make myself a simple plugin to "override" the Vue SFC compiler behavior.
The original [rollup-plugin-vue](https://github.com/vuejs/rollup-plugin-vue) makes use of the [@vue/compiler-sfc](https://github.com/vuejs/core/tree/main/packages/compiler-sfc) to split SFCs into three parts, the main JS logic, a template renderer function and postcss-processed style CSS codes. I created this plugin to keep the main JS and template rendering part but skip the CSS processing and output the raw style block content into a separate file instead.

## Limitation
The SFC scoped style cannot be used with this plugin as the scopeId is shared and injected into both the template renderer and the generated CSS codes during compile time. Skip processing the scoped raw style block with this plugin will cause broken linkage between the template renderer and the CSS codes.

The whole plugin is created heavily based on the existing [rollup-plugin-vue](https://github.com/vuejs/rollup-plugin-vue), the main idea is adding an override layer on top of the original plugin. Therefore the plugin `rollup-plugin-vue` is a mandatory peer dependency.
[rollup-plugin-vue](https://github.com/vuejs/rollup-plugin-vue) is picked instead of [@vitejs/plugin-vue](https://github.com/vitejs/vite/tree/main/packages/plugin-vue#vitejsplugin-vue) because this plugin should only be used for `build` stage, and the most critical reason is that only the rollup plugin have the required util functions exported.

# Installation

```
yarn add -D rollup-plugin-vue-sfc-style-splitter @vue/compiler-sfc rollup-plugin-vue rollup
```

# Usage

## Options
```typescript
type Options = {
    basePath: string; // Required. The absolute path of the project base dir. This will be used for emitting the raw style files.
    destPath: string; // Required. The absolute path of the output dir. This will be used for emitting the raw style files.
    styles: (string | RegExp)[]; // Required. The style types that should be split out.
    include?: string | RegExp | (string | RegExp)[]; // Optional. The common filtering option for rollup plugins. Default: /\.vue$/
    exclude?: string | RegExp | (string | RegExp)[]; // Optional. The common filtering option for rollup plugins. Default: []
    vueOptions?: Partial<VueOptions>; // Optional. The options that will be passed to rollup-plugin-vue
}
```

## Example Usage
```typescript
import { fileURLToPath, URL } from 'node:url';

import { resolve } from 'path';
import { defineConfig } from 'vite';
import sfcStyleSplitter from 'rollup-plugin-vue-sfc-style-splitter';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'MyLib',
            formats: ['es'],
            fileName: () => 'index.js',
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                globals: {
                    vue: 'vue',
                },
                dir: resolve(__dirname, 'lib'),
            },
            plugins: [
                sfcStyleSplitter({
                    styles: ['scss'],
                    basePath: resolve(__dirname, './src'),
                    destPath: resolve(__dirname, './lib'),
                }),
            ],
        },
        emptyOutDir: false,
    },
});

```
