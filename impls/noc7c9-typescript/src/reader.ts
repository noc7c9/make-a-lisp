import * as t from './types';
import * as logger from './logger';

type Token = string;

type Reader = {
    peek: () => Token | null;
    next: () => Token | null;
};

export function readStr(input: string): t.MalType | null {
    // logger.log('readStr("%s")', input);
    const tokens = tokenize(input);
    let pos = 0;
    const reader = {
        peek: () => tokens[pos],
        next: () => tokens[pos++],
    };

    if (tokens.length === 0) {
        return null;
    }

    const result = readForm(reader);
    // logger.log('readStr("%s") // => %s', input, result);
    return result;
}

function tokenize(input: string): Token[] {
    // logger.log('tokenize("%s")', input);
    const re = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s\[\]{}('"`,;)]*)/g;

    const tokens = [];
    for (;;) {
        const result = re.exec(input);
        if (result == null || result[1].length === 0) {
            break;
        }
        if (result[1][0] === ';') {
            continue;
        }
        tokens.push(result[1]);
    }

    // logger.log('tokenize("%s") // => %s', input, tokens);
    return tokens;
}

function readForm(reader: Reader): t.MalType {
    // logger.log('readForm', reader.peek());
    switch (reader.peek()) {
        case null:
            throw t.str('Hit EOF, unable to read form');
        case '(':
            return readList(reader, 'list', ')');
        case '[':
            return readList(reader, 'vec', ']');
        case '{':
            return readList(reader, 'map', '}');
        default:
            return readAtom(reader);
    }
}

function readList(
    reader: Reader,
    type: 'list' | 'map' | 'vec',
    end: string,
): t.MalType {
    const list: t.MalType[] = [];
    reader.next();
    for (;;) {
        const token = reader.peek();
        if (token == null) {
            throw t.str('Hit EOF, unexpected end of list');
        }
        if (token === end) {
            reader.next();
            break;
        }
        list.push(readForm(reader));
    }

    if (type === 'list' || type === 'vec') {
        return { type, value: list };
    }

    return t.map(list);
}

function readAtom(reader: Reader): t.MalType {
    const token = reader.next();
    if (token == null) {
        throw t.str('Hit EOF, unable to read atom');
    }

    if (token === 'nil') {
        return t.nil();
    }

    if (token === 'true' || token === 'false') {
        return t.bool(token === 'true');
    }

    if (/^(-|\+)?\d+$/.test(token)) {
        return t.int(parseInt(token, 10));
    }

    if (token[0] === ':') {
        return t.key(token);
    }

    if (token[0] === '"') {
        return t.str(parseStr(token));
    }

    if (token.startsWith("'")) return readWrapped(reader, 'quote');
    if (token.startsWith('`')) return readWrapped(reader, 'quasiquote');
    if (token.startsWith('~@')) return readWrapped(reader, 'splice-unquote');
    if (token.startsWith('~')) return readWrapped(reader, 'unquote');
    if (token.startsWith('@')) return readWrapped(reader, 'deref');

    if (token[0] === '^') {
        const meta = readForm(reader);
        const value = readForm(reader);
        return t.list(t.sym('with-meta'), value, meta);
    }

    return t.sym(token);
}

function readWrapped(reader: Reader, wrapper: string): t.MalType {
    return t.list(t.sym(wrapper), readForm(reader));
}

function parseStr(token: string): string {
    try {
        return JSON.parse(token.replace(/\n/, '\\n'));
    } catch (_) {
        throw t.str('Hit EOF, unexpected end of string');
    }
}
