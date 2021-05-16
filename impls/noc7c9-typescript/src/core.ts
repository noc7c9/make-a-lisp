import fs from 'fs';
import type { MalType, MalList, MalVec, FnReg } from './types';
import * as t from './types';
import * as reader from './reader';
import * as printer from './printer';

export const ns: Record<string, FnReg> = {
    '+': (a, b) => t.int(t.toInt(a) + t.toInt(b)),
    '-': (a, b) => t.int(t.toInt(a) - t.toInt(b)),
    '*': (a, b) => t.int(t.toInt(a) * t.toInt(b)),
    '/': (a, b) => t.int(Math.floor(t.toInt(a) / t.toInt(b))),

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

    '>': (a, b) => t.bool(t.toInt(a) > t.toInt(b)),
    '>=': (a, b) => t.bool(t.toInt(a) >= t.toInt(b)),
    '<': (a, b) => t.bool(t.toInt(a) < t.toInt(b)),
    '<=': (a, b) => t.bool(t.toInt(a) <= t.toInt(b)),

    cons: (elem, list) => t.list(elem, ...t.isListOrVec(list).value),
    concat: (...args) => {
        const concatted: MalType[] = [];
        for (let i = 0; i < args.length; i += 1) {
            concatted.push(...t.isListOrVec(args[i]).value);
        }
        return t.list(...concatted);
    },

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

    vec: (arg) => {
        if (arg.type === 'vec') return arg;
        return t.vec(...t.isList(arg).value);
    },

    'read-string': (arg) => reader.read_str(t.toStr(arg)) ?? t.nil(),
    slurp: (arg) => {
        const filepath = t.toStr(arg);
        const content = fs.readFileSync(filepath, 'utf8');
        return t.str(content);
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

    atom: (arg) => t.atom(arg),
    'atom?': (arg) => t.bool(arg.type === 'atom'),
    deref: (arg) => t.isAtom(arg).value,
    'reset!': (atom, value) => {
        t.isAtom(atom).value = value;
        return value;
    },
    'swap!': (maybeAtom, maybeFn, ...args) => {
        const atom = t.isAtom(maybeAtom);
        const fn = t.isFn(maybeFn);

        const oldVal = atom.value;
        const call = typeof fn.value === 'function' ? fn.value : fn.value.fn;
        const newVal = call(oldVal, ...args);
        atom.value = newVal;
        return newVal;
    },
};
