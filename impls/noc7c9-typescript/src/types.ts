import type { Env } from './env';

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
export type MalList = { type: 'list'; value: MalType[] };
export type MalMap = { type: 'map'; value: [MalKey | MalStr, MalType][] };
export type MalVec = { type: 'vec'; value: MalType[] };

export type FnReg = (...args: MalType[]) => MalType;
export type FnTco = {
    ast: MalType;
    env: Env;
    params: MalList | MalVec;
    fn: FnReg;
};
export type MalFn = { type: 'fn'; value: FnReg | FnTco };

export const sym = (value: string): MalSym => ({ type: 'sym', value });
export const bool = (value: boolean): MalBool => ({ type: 'bool', value });
export const int = (value: number): MalInt => ({ type: 'int', value });
export const str = (value: string): MalStr => ({ type: 'str', value });
export const nil = (): MalNil => ({ type: 'nil', value: null });
export const atom = (value: MalType): MalAtom => ({ type: 'atom', value });
export const list = (...value: MalType[]): MalList => ({ type: 'list', value });
export const vec = (...value: MalType[]): MalVec => ({ type: 'vec', value });
export const fn = (value: MalFn['value']): MalFn => ({ type: 'fn', value });

export const isSym = (val: MalType): MalSym => {
    if (val.type === 'sym') return val;
    throw new Error(`Expected sym, got ${val.type}`);
};
export const isAtom = (val: MalType): MalAtom => {
    if (val.type === 'atom') return val;
    throw new Error(`Expected atom, got ${val.type}`);
};
export const isList = (val: MalType): MalList => {
    if (val.type === 'list') return val;
    throw new Error(`Expected list, got ${val.type}`);
};
export const isVec = (val: MalType): MalVec => {
    if (val.type === 'vec') return val;
    throw new Error(`Expected vec, got ${val.type}`);
};
export const isListOrVec = (val: MalType): MalList | MalVec => {
    if (val.type === 'list' || val.type === 'vec') return val;
    throw new Error(`Expected list or vec, got ${val.type}`);
};
export const isFn = (val: MalType): MalFn => {
    if (val.type === 'fn') return val;
    throw new Error(`Expected fn, got ${val.type}`);
};

export const toBool = (val: MalType): boolean => {
    if (val.type === 'bool') return val.value;
    throw new Error(`Expected bool, got ${val.type}`);
};
export const toInt = (val: MalType): number => {
    if (val.type === 'int') return val.value;
    throw new Error(`Expected int, got ${val.type}`);
};
export const toStr = (val: MalType): string => {
    if (val.type === 'str') return val.value;
    throw new Error(`Expected str, got ${val.type}`);
};
