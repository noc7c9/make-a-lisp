import * as envM from './env';

export type MalType =
    | MalBool
    | MalInt
    | MalNil
    | MalStr
    | MalKey
    | MalSym
    | MalAtom
    | MalList
    | MalMap
    | MalVec
    | MalFn;

export type MalBool = { type: 'bool'; value: boolean };
export type MalInt = { type: 'int'; value: number };
export type MalNil = { type: 'nil'; value: null };
export type MalStr = { type: 'str'; value: string };
export type MalKey = { type: 'key'; value: string };
export type MalSym = { type: 'sym'; value: string };

export type MalAtom = { type: 'atom'; value: MalType };
export type MalList = { type: 'list'; value: MalType[]; meta?: MalType };
export type MalVec = { type: 'vec'; value: MalType[]; meta?: MalType };
export type MalMap = {
    type: 'map';
    value: Record<string, MalType>;
    meta?: MalType;
};

type Fn = (...args: MalType[]) => MalType;
export type FnNative = {
    type: 'native';
    call: Fn;
    isMacro: false;
    name?: string;
    meta?: MalType;
};
export type FnMal = {
    type: 'mal';
    ast: MalType;
    env: envM.Env;
    params: MalList | MalVec;
    isMacro: boolean;
    call: Fn;
    name?: string;
    meta?: MalType;
};
export type MalFn = { type: 'fn'; value: FnNative | FnMal };

export const sym = (value: string): MalSym => ({ type: 'sym', value });
export const key = (value: string): MalKey => ({ type: 'key', value });
export const bool = (value: boolean): MalBool => ({ type: 'bool', value });
export const int = (value: number): MalInt => ({ type: 'int', value });
export const str = (value: string): MalStr => ({ type: 'str', value });
export const nil = (): MalNil => ({ type: 'nil', value: null });
export const atom = (value: MalType): MalAtom => ({ type: 'atom', value });
export const list = (...value: MalType[]): MalList => ({ type: 'list', value });
export const vec = (...value: MalType[]): MalVec => ({ type: 'vec', value });
export const map = (value: MalType[] | Record<string, MalType>): MalMap => {
    if (!Array.isArray(value)) {
        return { type: 'map', value };
    }
    const map: MalMap['value'] = {};
    if (value.length % 2 === 1) {
        throw str('Missing last map value');
    }
    for (let i = 0; i < value.length; i += 2) {
        const key = value[i];
        const val = value[i + 1];
        map[malToMapKey(key)] = val;
    }
    return { type: 'map', value: map };
};

export const fn = (value: MalFn['value']): MalFn => ({ type: 'fn', value });
export const fnNative = (name: string, call: Fn): MalFn => ({
    type: 'fn',
    value: {
        type: 'native',
        name,
        call,
        isMacro: false,
    },
});

export const malToMapKey = (k: MalType): string => {
    if (k.type !== 'key' && k.type !== 'str') {
        throw str(`Hit non-string/keyword map key \`${k.type}\``);
    }
    return `${k.type}$${k.value}`;
};
export const mapKeyToMal = (k: string): MalKey | MalStr => {
    const value = k.slice(k.indexOf('$') + 1);
    if (k.startsWith('key$')) return key(value);
    if (k.startsWith('str$')) return str(value);
    throw str(`Not a map key ${k}`);
};

export const isSym = (val: MalType): MalSym => {
    if (val.type === 'sym') return val;
    throw str(`Expected sym, got ${val.type}`);
};
export const isAtom = (val: MalType): MalAtom => {
    if (val.type === 'atom') return val;
    throw str(`Expected atom, got ${val.type}`);
};
export const isList = (val: MalType): MalList => {
    if (val.type === 'list') return val;
    throw str(`Expected list, got ${val.type}`);
};
export const isVec = (val: MalType): MalVec => {
    if (val.type === 'vec') return val;
    throw str(`Expected vec, got ${val.type}`);
};
export const isListOrVec = (val: MalType): MalList | MalVec => {
    if (val.type === 'list' || val.type === 'vec') return val;
    throw str(`Expected list or vec, got ${val.type}`);
};
export const isMap = (val: MalType): MalMap => {
    if (val.type === 'map') return val;
    throw str(`Expected map, got ${val.type}`);
};
export const isFn = (val: MalType): MalFn => {
    if (val.type === 'fn') return val;
    throw str(`Expected fn, got ${val.type}`);
};

export const toFn = (val: MalType): Fn => isFn(val).value.call;

export const toBool = (val: MalType): boolean => {
    if (val.type === 'bool') return val.value;
    throw str(`Expected bool, got ${val.type}`);
};
export const toInt = (val: MalType): number => {
    if (val.type === 'int') return val.value;
    throw str(`Expected int, got ${val.type}`);
};
export const toStr = (val: MalType): string => {
    if (val.type === 'str') return val.value;
    throw str(`Expected str, got ${val.type}`);
};
