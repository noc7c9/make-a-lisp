import logger from './logger';
import type { MalType, MalSym } from './types';
import * as t from './types';
import * as printer from './printer';

export type Env = {
    set(sym: MalSym, val: MalType): void;
    find(sym: MalSym): MalType | null;
    get(sym: MalSym): MalType;
    log(indent?: number): string;
};

export function init(
    outer: Env | null,
    binds: MalSym[] = [],
    exprs: MalType[] = [],
): Env {
    const data: Record<string, MalType> = {};

    const set: Env['set'] = (sym, val) => {
        // logger('set(%s, %s)', sym, val);
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
            // logger('find(%s) // => %s', sym, result);
            return result;
        }
        if (outer != null) {
            return outer.find(sym);
        }
        // logger('find(%s) // => null', sym);
        return null;
    };
    const get: Env['get'] = (sym) => {
        const result = find(sym);
        if (result == null) {
            throw t.str(`'${sym.value}' not found`);
        }
        return result;
    };

    const log: Env['log'] = (indent = 0) => {
        const i = (string: string) => ' '.repeat(indent) + string;

        const lines = ['{'];
        Object.entries(data).forEach(([key, val]) => {
            lines.push(i(`  ${key}: ${printer.print_str(val, true)},`));
        });
        if (outer != null) {
            lines.push(i(`  outer = ${outer.log(indent + 2)}`));
        }
        lines.push(i('}'));
        return lines.join('\n');
    };

    for (let i = 0; i < binds.length; i += 1) {
        if (binds[i].value === '&') {
            set(binds[i + 1], t.list(...exprs.slice(i)));
            break;
        }
        set(binds[i], exprs[i]);
    }

    return {
        set,
        find,
        get,
        log,
        [logger.custom]: () => log(),
    };
}
