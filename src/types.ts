import { Options as VueOptions } from 'rollup-plugin-vue';

export type Options = {
    basePath: string;
    destPath: string;
    include: string | RegExp | (string | RegExp)[];
    exclude: string | RegExp | (string | RegExp)[];
    styles: (string | RegExp)[];
    vueOptions?: Partial<VueOptions>;
};

export type StyleMeta = {
    styleModuleId: string;
    relativeDest: string;
    filename: string;
    vueId: string;
    styleIndex: string;
    content?: string;
};
