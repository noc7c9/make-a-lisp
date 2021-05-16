export type MalType =
    | MalBool
    | MalInt
    | MalNil
    | MalStr
    | MalSym
    | MalList
    | MalMap
    | MalVec;

export type MalBool = { type: 'bool'; value: boolean };
export type MalInt = { type: 'int'; value: number };
export type MalNil = { type: 'nil' };
export type MalStr = { type: 'str'; value: string };
export type MalSym = { type: 'sym'; value: string; resolved?: unknown };

export type MalList = { type: 'list'; value: MalType[] };
export type MalMap = { type: 'map'; value: [MalSym | MalStr, MalType][] };
export type MalVec = { type: 'vec'; value: MalType[] };
