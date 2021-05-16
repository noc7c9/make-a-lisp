import logger from './logger';
import { MalType, MalSym } from './types';

export type Env = {
    outer: Env | null;
    data: Record<string, MalType>;

    set(sym: MalSym, val: MalType): void;
    find(sym: MalSym): MalType | null;
    get(sym: MalSym): MalType;
};

export function init(outer: Env['outer']): Env {
    const data: Env['data'] = {};

    const set: Env['set'] = (sym, val) => {
        logger('set(%s, %s)', sym, val);
        if (val == null) {
            delete data[sym.value];
        } else {
            // change the name of functions to improve logs
            if (typeof val === 'function') {
                Object.defineProperty(val, 'name', { value: sym.value });
            }
            data[sym.value] = val;
        }
    };
    const find: Env['find'] = (sym) => {
        if (sym.value in data) {
            const result = data[sym.value];
            logger('find(%s) // => %s', sym, result);
            return result;
        }
        if (outer != null) {
            return outer.find(sym);
        }
        logger('find(%s) // => null', sym);
        return null;
    };
    const get: Env['get'] = (sym) => {
        const result = find(sym);
        if (result == null) {
            throw new Error(`'${sym.value}' not found`);
        }
        return result;
    };

    return {
        outer,
        data,
        set,
        find,
        get,
        [logger.custom]: () => {
            const pretty: any = { data };
            if (outer != null) {
                pretty.outer = outer;
            }
            return logger.inspect(pretty);
        },
    };
}
