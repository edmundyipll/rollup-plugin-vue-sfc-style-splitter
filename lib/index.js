"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pluginutils_1 = require("@rollup/pluginutils");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const query_1 = require("rollup-plugin-vue/dist/query");
const descriptorCache_1 = require("rollup-plugin-vue/dist/utils/descriptorCache");
const utils_1 = require("./utils");
const vuePlugin = require('rollup-plugin-vue');
const defaultOptions = {
    include: /\.vue$/,
    exclude: [],
};
const styleMetaMap = new Map();
function sfcStyleSplitter(rawOptions) {
    var _a;
    const options = Object.assign(Object.assign({}, defaultOptions), rawOptions);
    const filter = (0, pluginutils_1.createFilter)(options.include, options.exclude);
    const originalVuePlugin = vuePlugin(Object.assign({ include: options.include, exclude: options.exclude, target: 'browser' }, ((_a = options.vueOptions) !== null && _a !== void 0 ? _a : {})));
    return Object.assign(Object.assign({}, originalVuePlugin), { name: 'sfc-style-splitter', 
        // override `external` option to add generated style module file as external
        options(inputOptions) {
            const original = inputOptions.external;
            const regexList = options.styles.map(utils_1.getStyleModuleFilePattern);
            if (original instanceof Function) {
                inputOptions.external = (source, importer, isResolved) => original.call(null, source, importer, isResolved) ||
                    regexList.reduce((carry, regex) => carry || regex.test(source), false);
            }
            else {
                if (Array.isArray(original)) {
                    inputOptions.external = [...original, ...regexList];
                }
                else {
                    inputOptions.external = [
                        ...(original ? [original] : []),
                        ...regexList,
                    ];
                }
            }
            return inputOptions;
        },
        transform(code, id) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                // check if is styleModuleId
                const parsed = (0, utils_1.parseStyleModuleId)(id);
                if (parsed) {
                    const descriptor = (0, descriptorCache_1.getDescriptor)(parsed.vueId);
                    if (descriptor) {
                        const index = parseInt(parsed.index);
                        const block = descriptor.styles[index];
                        if (block) {
                            // set code block into metaMap
                            const metaList = styleMetaMap.get(parsed.vueId);
                            const metaIndex = (_a = metaList === null || metaList === void 0 ? void 0 : metaList.findIndex((meta) => meta.styleModuleId === id)) !== null && _a !== void 0 ? _a : -1;
                            if (metaList && metaIndex >= 0) {
                                metaList[metaIndex].content = block.content;
                                styleMetaMap.set(parsed.vueId, metaList);
                                (0, utils_1.logger)(`Loaded content from style block ${index} from ${parsed.vueId}`);
                                if (block.module) {
                                    // return empty string so that the `import "..."` statement will be ignored from bundle
                                    return {
                                        code: '',
                                    };
                                }
                                else {
                                    // return the generated file name
                                    return {
                                        code: `import "./${metaList[metaIndex].filename}";\n`,
                                    };
                                }
                            }
                        }
                    }
                }
                const query = (0, query_1.parseVuePartRequest)(id);
                if (!query.vue && filter(id)) {
                    // use customized transformer
                    const output = (0, utils_1.transformSFCEntry)(query, code, id, options, this, styleMetaMap);
                    (0, utils_1.logger)(output);
                    return output;
                }
                // fallback to original transform function from rollup-plugin-vue
                return originalVuePlugin.transform.call(this, code, id);
            });
        },
        generateBundle() {
            for (const [vueId, metaList] of styleMetaMap) {
                metaList.forEach((meta) => {
                    if (!meta.content)
                        return;
                    const targetAbsoluteDest = path.resolve(options.destPath, meta.relativeDest);
                    if (mkdirp.sync(path.dirname(targetAbsoluteDest), {
                        fs,
                    })) {
                        fs.writeFileSync(targetAbsoluteDest, meta.content);
                        (0, utils_1.logger)(`Emitted content of style block ${meta.styleIndex} from ${meta.vueId} to path ${targetAbsoluteDest}`);
                    }
                    else {
                        this.error(`Unable to create nested folder in target destination ${meta.relativeDest}`);
                    }
                });
            }
        } });
}
exports.default = sfcStyleSplitter;
