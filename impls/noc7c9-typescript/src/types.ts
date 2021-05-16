export type MalType =
    | MalBool
    | MalInt
    | MalNil
    | MalStr
    | MalSym
    | MalList
    | MalMap
    | MalVec
    | MalFn;

export type MalBool = { type: 'bool'; value: boolean };
export type MalInt = { type: 'int'; value: number };
export type MalNil = { type: 'nil'; value: null };
export type MalStr = { type: 'str'; value: string };
export type MalSym = { type: 'sym'; value: string };

export type MalList = { type: 'list'; value: MalType[] };
export type MalMap = { type: 'map'; value: [MalSym | MalStr, MalType][] };
export type MalVec = { type: 'vec'; value: MalType[] };

export type MalFn = { type: 'fn'; value: (...args: MalType[]) => MalType };

export const sym = (value: string): MalSym => ({ type: 'sym', value });
export const bool = (value: boolean): MalBool => ({ type: 'bool', value });
export const int = (value: number): MalInt => ({ type: 'int', value });
export const str = (value: string): MalStr => ({ type: 'str', value });
export const nil = (): MalNil => ({ type: 'nil', value: null });
export const fn = (value: MalFn['value']): MalFn => ({ type: 'fn', value });

export const isSym = (val: MalType): MalSym => {
    if (val.type === 'sym') return val;
    throw new Error(`Expected sym, got ${val.type}`);
};
export const isBool = (val: MalType): boolean => {
    if (val.type === 'bool') return val.value;
    throw new Error(`Expected bool, got ${val.type}`);
};
export const isInt = (val: MalType): number => {
    if (val.type === 'int') return val.value;
    throw new Error(`Expected int, got ${val.type}`);
};
export const isStr = (val: MalType): string => {
    if (val.type === 'str') return val.value;
    throw new Error(`Expected str, got ${val.type}`);
};
