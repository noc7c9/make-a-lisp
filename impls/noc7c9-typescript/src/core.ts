import type { MalFn, MalList, MalVec } from './types';
import * as t from './types';
import * as printer from './printer';

export const ns: Record<string, MalFn['value']> = {
    '+': (a, b) => t.int(t.isInt(a) + t.isInt(b)),
    '-': (a, b) => t.int(t.isInt(a) - t.isInt(b)),
    '*': (a, b) => t.int(t.isInt(a) * t.isInt(b)),
    '/': (a, b) => t.int(Math.floor(t.isInt(a) / t.isInt(b))),

    '=': (a, b) => {
        if (
            (a.type === 'vec' || a.type === 'list') &&
            (b.type === 'vec' || b.type === 'list')
        ) {
            const a_ = a.value;
            const b_ = b.value;
            if (a_.length !== b_.length) return t.bool(false);
            return t.bool(a_.every((_, i) => ns['='](a_[i], b_[i]).value));
        }

        if (a.type !== b.type) return t.bool(false);
        return t.bool(a.value === b.value);
    },

    '>': (a, b) => t.bool(t.isInt(a) > t.isInt(b)),
    '>=': (a, b) => t.bool(t.isInt(a) >= t.isInt(b)),
    '<': (a, b) => t.bool(t.isInt(a) < t.isInt(b)),
    '<=': (a, b) => t.bool(t.isInt(a) <= t.isInt(b)),

    list: (...args) => t.list(...args),
    'list?': (arg) => t.bool(arg.type === 'list'),
    'empty?': (arg) => t.bool(t.isListOrVec(arg).value.length === 0),
    count: (arg) => {
        try {
            return t.int(t.isListOrVec(arg).value.length);
        } catch (_) {
            return t.int(0);
        }
    },

    'pr-str': (...args) =>
        t.str(args.map((a) => printer.print_str(a, true)).join(' ')),
    str: (...args) =>
        t.str(args.map((a) => printer.print_str(a, false)).join('')),
    prn: (...args) => {
        console.log(args.map((a) => printer.print_str(a, true)).join(' '));
        return t.nil();
    },
    println: (...args) => {
        console.log(args.map((a) => printer.print_str(a, false)).join(' '));
        return t.nil();
    },
};
