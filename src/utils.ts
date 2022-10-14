import * as debug from 'debug';
import * as path from 'path';
import { TransformPluginContext } from 'rollup';
import type { Query as VueQuery } from 'rollup-plugin-vue/dist/query';
import { transformSFCEntry as VueTransformSFCEntry } from 'rollup-plugin-vue/dist/sfc';
import { getDescriptor } from 'rollup-plugin-vue/dist/utils/descriptorCache';
import { Options, StyleMeta } from './types';

export const logger = debug('sfc-style-splitter');

export const QUERY_TYPE_SPLIT_TYPE_MODULE = 'splitStyleModule';
export const FILE_EXTENSION_PREFIX_SPLIT_STYLE = '__split_style';

export const getStyleModuleId = (vueId: string, index: string) =>
    `${vueId}?type=${QUERY_TYPE_SPLIT_TYPE_MODULE}&index=${index}`;

export const parseStyleModuleId = (
    id: string,
): { vueId: string; index: string } | null => {
    const regex = new RegExp(`^([^?]+)\\?type=${QUERY_TYPE_SPLIT_TYPE_MODULE}&index=([\\d]+)$`, 'i');
    const matches = id.match(
        regex,
    );
    if (!matches) return null;
    return {
        vueId: matches[1],
        index: matches[2],
    };
};

export const getStyleModuleFilePattern = (
    style: string,
): RegExp => {
    return new RegExp(
        `\\.${FILE_EXTENSION_PREFIX_SPLIT_STYLE}\\.[\\d]+(\\.module)?\\.${style}`,
        'i',
    );
};

export const getStyleModuleFileExtension = (
    style: string,
    index: string,
    isModule: boolean,
): string => {
    return `${FILE_EXTENSION_PREFIX_SPLIT_STYLE}.${index}.${isModule ? 'module.' : ''}${style}`;
}

export const transformSFCEntry = (
    query: VueQuery,
    code: string,
    id: string,
    options: Options,
    context: TransformPluginContext,
    styleMetaMap: Map<string, StyleMeta[]>,
) => {
    const output = VueTransformSFCEntry(
        code,
        id,
        { ...options, target: 'browser', exposeFilename: false },
        process.cwd(),
        false,
        false,
        () => false,
        context,
    );
    if (!output) return null;
    const descriptor = getDescriptor(id);
    let metaList: StyleMeta[] = [];
    if(descriptor.styles.length) {
        descriptor.styles.forEach((style, index) => {
            if(style.scoped) return;
            if(!options.styles.find(styleOrRegex => typeof(styleOrRegex) === 'string' ? styleOrRegex === style.lang : styleOrRegex.test(style.lang))) {
                return;
            }
            const filename = `${path.basename(
                query.filename,
            )}.${getStyleModuleFileExtension(style.lang, `${index}`, !!style.module)}`;
            const relativePath = path.relative(
                options.basePath,
                path.dirname(query.filename),
            );
            const relativeDest = `./${path.join(
                relativePath,
                filename,
            )}`;
            const styleModuleId = getStyleModuleId(
                id,
                `${index}`,
            );
            metaList.push({
                styleModuleId,
                relativeDest,
                filename,
                vueId: id,
                styleIndex: `${index}`,
            });
            const regex = new RegExp(`import\\s+"[^\\s]+type=style[^\\s]+index=${index}[^\\n]+\n`, 'mi');
            output.code = output.code.replace(regex, (substring) => {
                logger(`Found style block ${index} from ${id}`);
                return `import "${styleModuleId}";\n`;
            });
            if(style.module) {
                const regex = new RegExp(`^(import\\s+style${index}\\s+from\\s+[^\\n]+type=style[^\\n]+\\n)`, 'mi');
                output.code = output.code.replace(regex, (substring) => {
                    logger(`Found module style block ${index} from ${id}`);
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
