"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSFCEntry = exports.getStyleModuleFileExtension = exports.getStyleModuleFilePattern = exports.parseStyleModuleId = exports.getStyleModuleId = exports.FILE_EXTENSION_PREFIX_SPLIT_STYLE = exports.QUERY_TYPE_SPLIT_TYPE_MODULE = exports.logger = void 0;
const debug = require("debug");
const path = require("path");
const sfc_1 = require("rollup-plugin-vue/dist/sfc");
const descriptorCache_1 = require("rollup-plugin-vue/dist/utils/descriptorCache");
exports.logger = debug('sfc-style-splitter');
exports.QUERY_TYPE_SPLIT_TYPE_MODULE = 'splitStyleModule';
exports.FILE_EXTENSION_PREFIX_SPLIT_STYLE = '__split_style';
const getStyleModuleId = (vueId, index) => `${vueId}?type=${exports.QUERY_TYPE_SPLIT_TYPE_MODULE}&index=${index}`;
exports.getStyleModuleId = getStyleModuleId;
const parseStyleModuleId = (id) => {
    const regex = new RegExp(`^([^?]+)\\?type=${exports.QUERY_TYPE_SPLIT_TYPE_MODULE}&index=([\\d]+)$`, 'i');
    const matches = id.match(regex);
    if (!matches)
        return null;
    return {
        vueId: matches[1],
        index: matches[2],
    };
};
exports.parseStyleModuleId = parseStyleModuleId;
const getStyleModuleFilePattern = (style) => {
    return new RegExp(`\\.${exports.FILE_EXTENSION_PREFIX_SPLIT_STYLE}\\.[\\d]+(\\.module)?\\.${style}`, 'i');
};
exports.getStyleModuleFilePattern = getStyleModuleFilePattern;
const getStyleModuleFileExtension = (style, index, isModule) => {
    return `${exports.FILE_EXTENSION_PREFIX_SPLIT_STYLE}.${index}.${isModule ? 'module.' : ''}${style}`;
};
exports.getStyleModuleFileExtension = getStyleModuleFileExtension;
const transformSFCEntry = (query, code, id, options, context, styleMetaMap) => {
    const output = (0, sfc_1.transformSFCEntry)(code, id, Object.assign(Object.assign({}, options), { target: 'browser', exposeFilename: false }), process.cwd(), false, false, () => false, context);
    if (!output)
        return null;
    const descriptor = (0, descriptorCache_1.getDescriptor)(id);
    let metaList = [];
    if (descriptor.styles.length) {
        descriptor.styles.forEach((style, index) => {
            if (style.scoped)
                return;
            if (!options.styles.find(styleOrRegex => typeof (styleOrRegex) === 'string' ? styleOrRegex === style.lang : styleOrRegex.test(style.lang))) {
                return;
            }
            const filename = `${path.basename(query.filename)}.${(0, exports.getStyleModuleFileExtension)(style.lang, `${index}`, !!style.module)}`;
            const relativePath = path.relative(options.basePath, path.dirname(query.filename));
            const relativeDest = `./${path.join(relativePath, filename)}`;
            const styleModuleId = (0, exports.getStyleModuleId)(id, `${index}`);
            metaList.push({
                styleModuleId,
                relativeDest,
                filename,
                vueId: id,
                styleIndex: `${index}`,
            });
            const regex = new RegExp(`import\\s+"[^\\s]+type=style[^\\s]+index=${index}[^\\n]+\n`, 'mi');
            output.code = output.code.replace(regex, (substring) => {
                (0, exports.logger)(`Found style block ${index} from ${id}`);
                return `import "${styleModuleId}";\n`;
            });
            if (style.module) {
                const regex = new RegExp(`^(import\\s+style${index}\\s+from\\s+[^\\n]+type=style[^\\n]+\\n)`, 'mi');
                output.code = output.code.replace(regex, (substring) => {
                    (0, exports.logger)(`Found module style block ${index} from ${id}`);
                    return `import style${index} from "./${filename}";\n`;
                });
            }
        });
    }
    if (metaList.length) {
        styleMetaMap.set(id, metaList);
    }
    return output;
};
exports.transformSFCEntry = transformSFCEntry;
