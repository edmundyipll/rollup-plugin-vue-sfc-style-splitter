import { TransformPluginContext } from 'rollup';
import type { Query as VueQuery } from 'rollup-plugin-vue/dist/query';
import { Options, StyleMeta } from './types';
export declare const logger: any;
export declare const QUERY_TYPE_SPLIT_TYPE_MODULE = "splitStyleModule";
export declare const FILE_EXTENSION_PREFIX_SPLIT_STYLE = "__split_style";
export declare const getStyleModuleId: (vueId: string, index: string) => string;
export declare const parseStyleModuleId: (id: string) => {
    vueId: string;
    index: string;
} | null;
export declare const getStyleModuleFilePattern: (style: string) => RegExp;
export declare const getStyleModuleFileExtension: (style: string, index: string, isModule: boolean) => string;
export declare const transformSFCEntry: (query: VueQuery, code: string, id: string, options: Options, context: TransformPluginContext, styleMetaMap: Map<string, StyleMeta[]>) => {
    code: string;
    map: {
        mappings: string;
    };
};
