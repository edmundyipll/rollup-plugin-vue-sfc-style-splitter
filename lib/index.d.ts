import { Plugin } from 'rollup';
import { Options } from './types';
export default function sfcStyleSplitter(rawOptions: Partial<Options> & Required<Pick<Options, 'basePath' | 'destPath' | 'styles'>>): Plugin;
