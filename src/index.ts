import { createFilter } from '@rollup/pluginutils';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import { Plugin } from 'rollup';
import { parseVuePartRequest } from 'rollup-plugin-vue/dist/query';
import { getDescriptor } from 'rollup-plugin-vue/dist/utils/descriptorCache';
import { Options, StyleMeta } from './types';
import { getStyleModuleFilePattern, logger, parseStyleModuleId, transformSFCEntry } from './utils';
const vuePlugin = require('rollup-plugin-vue');

const defaultOptions: Required<Pick<Options, 'include' | 'exclude'>> = {
    include: /\.vue$/,
    exclude: [],
};
const styleMetaMap = new Map<string, StyleMeta[]>();

export default function sfcStyleSplitter(
    rawOptions: Partial<Options> & Required<Pick<Options, 'basePath' | 'destPath' | 'styles'>>,
): Plugin {
    const options: NonNullable<Options> = {
        ...defaultOptions,
        ...rawOptions,
    };
    const filter = createFilter(options.include, options.exclude);

    const originalVuePlugin = vuePlugin({
        include: options.include,
        exclude: options.exclude,
        target: 'browser',
        ...(options.vueOptions ?? {}),
    });

    return {
        ...originalVuePlugin,
        name: 'sfc-style-splitter',
        // override `external` option to add generated style module file as external
        options(inputOptions) {
            const original = inputOptions.external;
            const regexList = options.styles.map(getStyleModuleFilePattern);
            if (original instanceof Function) {
                inputOptions.external = (
                    source: string,
                    importer: string | undefined,
                    isResolved: boolean,
                ) =>
                    original.call(null, source, importer, isResolved) ||
                    regexList.reduce((carry, regex) => carry || regex.test(source), false);
            } else {
                if (Array.isArray(original)) {
                    inputOptions.external = [...original, ...regexList];
                } else {
                    inputOptions.external = [
                        ...(original ? [original] : []),
                        ...regexList,
                    ];
                }
            }
            return inputOptions;
        },
        async transform(code, id) {
            // check if is styleModuleId
            const parsed = parseStyleModuleId(id);
            if (parsed) {
                const descriptor = getDescriptor(parsed.vueId);
                if (descriptor) {
                    const index = parseInt(parsed.index);
                    const block = descriptor.styles[index];
                    if (block) {
                        // set code block into metaMap
                        const metaList = styleMetaMap.get(
                            parsed.vueId,
                        );
                        const metaIndex =
                            metaList?.findIndex(
                                (meta) => meta.styleModuleId === id,
                            ) ?? -1;
                        if (metaList && metaIndex >= 0) {
                            metaList[metaIndex].content = block.content;
                            styleMetaMap.set(parsed.vueId, metaList);
                            logger(
                                `Loaded content from style block ${index} from ${parsed.vueId}`,
                            );
                            if(block.module) {
                                // return empty string so that the `import "..."` statement will be ignored from bundle
                                return {
                                    code: '',
                                };
                            }else{
                                // return the generated file name
                                return {
                                    code: `import "./${metaList[metaIndex].filename}";\n`,
                                }
                            }
                        }
                    }
                }
            }
            const query = parseVuePartRequest(id);
            if(!query.vue && filter(id)) {
                // use customized transformer
                const output = transformSFCEntry(
                    query,
                    code,
                    id,
                    options,
                    this,
                    styleMetaMap,
                );
                logger(output);
                return output;
            }
            // fallback to original transform function from rollup-plugin-vue
            return originalVuePlugin.transform.call(this, code, id);
        },
        generateBundle() {
            for (const [vueId, metaList] of styleMetaMap) {
                metaList.forEach((meta) => {
                    if (!meta.content) return;
                    const targetAbsoluteDest = path.resolve(
                        options.destPath,
                        meta.relativeDest,
                    );
                    if (
                        mkdirp.sync(path.dirname(targetAbsoluteDest), {
                            fs,
                        })
                    ) {
                        fs.writeFileSync(targetAbsoluteDest, meta.content);
                        logger(
                            `Emitted content of style block ${meta.styleIndex} from ${meta.vueId} to path ${targetAbsoluteDest}`,
                        );
                    } else {
                        this.error(
                            `Unable to create nested folder in target destination ${meta.relativeDest}`,
                        );
                    }
                });
            }
        },
    };
}
