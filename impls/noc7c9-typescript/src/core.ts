import fs from 'fs';

import * as t from './types';
import * as reader from './reader';
import * as printer from './printer';
import * as readline from './readline';

type Fn = t.MalFn['value']['call'];

const eq: Fn = (a, b) => {
    if (
        (a.type === 'vec' || a.type === 'list') &&
        (b.type === 'vec' || b.type === 'list')
    ) {
        const a_ = a.value;
        const b_ = b.value;
        if (a_.length !== b_.length) return t.bool(false);
        return t.bool(a_.every((_, i) => eq(a_[i], b_[i]).value));
    }

    if (a.type === 'map' && b.type === 'map') {
        const a_ = a.value;
        const b_ = b.value;
        const aKeys = Object.keys(a_);
        const bKeys = Object.keys(b_);
        if (aKeys.length !== bKeys.length) return t.bool(false);
        return t.bool(aKeys.every((k) => eq(a_[k], b_[k]).value));
    }

    if (a.type !== b.type) return t.bool(false);
    return t.bool(a.value === b.value);
};

export const ns: Record<string, Fn> = {
    throw: (arg) => {
        throw arg;
    },

    '=': eq,

    'fn?': (arg) => t.bool(arg.type === 'fn' && !arg.value.isMacro),
    'macro?': (arg) => t.bool(arg.type === 'fn' && arg.value.isMacro),

    'nil?': (arg) => t.bool(arg.type === 'nil'),
    'true?': (arg) => t.bool(arg.type === 'bool' && arg.value === true),
    'false?': (arg) => t.bool(arg.type === 'bool' && arg.value === false),

    'number?': (arg) => t.bool(arg.type === 'int'),
    'string?': (arg) => t.bool(arg.type === 'str'),

    symbol: (arg) => t.sym(t.toStr(arg)),
    'symbol?': (arg) => t.bool(arg.type === 'sym'),

    keyword: (arg) => {
        if (arg.type === 'key') return arg;
        return t.key(':' + t.toStr(arg));
    },
    'keyword?': (arg) => t.bool(arg.type === 'key'),

    'pr-str': (...args) =>
        t.str(args.map((a) => printer.printStr(a, true)).join(' ')),
    str: (...args) =>
        t.str(args.map((a) => printer.printStr(a, false)).join('')),
    prn: (...args) => {
        console.log(args.map((a) => printer.printStr(a, true)).join(' '));
        return t.nil();
    },
    println: (...args) => {
        console.log(args.map((a) => printer.printStr(a, false)).join(' '));
        return t.nil();
    },

    readline: (arg) => {
        const result = readline.prompt(t.toStr(arg));
        return result == null ? t.nil() : t.str(result);
    },
    'read-string': (arg) => reader.readStr(t.toStr(arg)) ?? t.nil(),
    slurp: (arg) => {
        const filepath = t.toStr(arg);
        const content = fs.readFileSync(filepath, 'utf8');
        return t.str(content);
    },

    '<': (a, b) => t.bool(t.toInt(a) < t.toInt(b)),
    '<=': (a, b) => t.bool(t.toInt(a) <= t.toInt(b)),
    '>': (a, b) => t.bool(t.toInt(a) > t.toInt(b)),
    '>=': (a, b) => t.bool(t.toInt(a) >= t.toInt(b)),
    '+': (a, b) => t.int(t.toInt(a) + t.toInt(b)),
    '-': (a, b) => t.int(t.toInt(a) - t.toInt(b)),
    '*': (a, b) => t.int(t.toInt(a) * t.toInt(b)),
    '/': (a, b) => t.int(Math.floor(t.toInt(a) / t.toInt(b))),

    'time-ms': () => t.int(Date.now()),

    list: (...args) => t.list(...args),
    'list?': (arg) => t.bool(arg.type === 'list'),

    vector: (...args) => t.vec(...args),
    'vector?': (arg) => t.bool(arg.type === 'vec'),
    vec: (arg) => {
        if (arg.type === 'vec') return arg;
        return t.vec(...t.isList(arg).value);
    },

    'hash-map': (...args) => t.map(args),
    'map?': (arg) => t.bool(arg.type === 'map'),
    assoc: (map, ...args) => {
        const oldMap = t.isMap(map).value;
        const newMap = t.map(args).value;
        return t.map(Object.assign({}, oldMap, newMap));
    },
    dissoc: (map, ...args) => {
        const clone = { ...t.isMap(map).value };
        for (let i = 0; i < args.length; i += 1) {
            const mapKey = t.malToMapKey(args[i]);
            delete clone[mapKey];
        }
        return t.map(clone);
    },
    get: (map, key) => {
        if (map.type === 'nil') return t.nil();
        return t.isMap(map).value[t.malToMapKey(key)] || t.nil();
    },
    'contains?': (map, key) => t.bool(t.malToMapKey(key) in t.isMap(map).value),
    keys: (map) =>
        t.list(...Object.keys(t.isMap(map).value).map((k) => t.mapKeyToMal(k))),
    vals: (map) => t.list(...Object.values(t.isMap(map).value)),

    'sequential?': (arg) => t.bool(arg.type === 'list' || arg.type === 'vec'),
    cons: (elem, list) => t.list(elem, ...t.isListOrVec(list).value),
    concat: (...args) => {
        const concatted: t.MalType[] = [];
        for (let i = 0; i < args.length; i += 1) {
            concatted.push(...t.isListOrVec(args[i]).value);
        }
        return t.list(...concatted);
    },
    nth: (arg, idx) => {
        const values = t.isListOrVec(arg).value;
        const i = t.toInt(idx);
        if (i >= values.length) {
            throw t.str('nth: index out of range');
        }
        return values[i];
    },
    first: (arg) => {
        if (arg.type === 'nil') return t.nil();
        const values = t.isListOrVec(arg).value;
        if (values.length === 0) return t.nil();
        return values[0];
    },
    rest: (arg) => {
        if (arg.type === 'nil') return t.list();
        return t.list(...t.isListOrVec(arg).value.slice(1));
    },
    'empty?': (arg) => t.bool(t.isListOrVec(arg).value.length === 0),
    count: (arg) => {
        try {
            return t.int(t.isListOrVec(arg).value.length);
        } catch (_) {
            return t.int(0);
        }
    },
    apply: (fn, ...args) => {
        args.push(...t.isListOrVec(args.pop()!).value);
        return t.toFn(fn)(...args);
    },
    map: (fn, list) => {
        const call = t.toFn(fn);
        return t.list(...t.isListOrVec(list).value.map((arg) => call(arg)));
    },
    conj: (arg, ...elems) => {
        if (arg.type === 'list') {
            return t.list(...elems.reverse(), ...arg.value);
        }
        if (arg.type === 'vec') {
            return t.vec(...arg.value, ...elems);
        }
        throw t.str(`conj is not supported for ${arg.type}`);
    },
    seq: (arg) => {
        if (arg.type === 'nil') return arg;
        if (arg.type !== 'list' && arg.type !== 'vec' && arg.type !== 'str') {
            throw t.str(`seq is not supported for ${arg.type}`);
        }
        if (arg.value.length === 0) return t.nil();
        if (arg.type === 'vec') return t.list(...arg.value);
        if (arg.type === 'str')
            return t.list(...arg.value.split('').map(t.str));
        return arg;
    },

    'with-meta': (arg, meta) => {
        switch (arg.type) {
            case 'nil':
            case 'bool':
            case 'int':
            case 'sym':
            case 'key':
            case 'str':
            case 'atom':
                throw t.str(`Cannot attach meta-data to ${arg.type}`);

            case 'list':
            case 'map':
            case 'vec':
            case 'fn':
                return { ...arg, meta };
        }
    },
    meta: (arg) => {
        if ('meta' in arg && arg.meta != null) return arg.meta;
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
        const newVal = t.toFn(fn)(oldVal, ...args);
        atom.value = newVal;
        return newVal;
    },
};
