import logger from './logger';
import * as t from './types';

type Token = string;

type Reader = {
    peek: () => Token | null;
    next: () => Token | null;
};

export function read_str(input: string): t.MalType | null {
    // logger('read_str("%s")', input);
    const tokens = tokenize(input);
    let pos = 0;
    const reader = {
        peek: () => tokens[pos],
        next: () => tokens[pos++],
    };

    if (tokens.length === 0) {
        return null;
    }

    const result = read_form(reader);
    // logger('read_str("%s") // => %s', input, result);
    return result;
}

function tokenize(input: string): Token[] {
    // logger('tokenize("%s")', input);
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

    // logger('tokenize("%s") // => %s', input, tokens);
    return tokens;
}

function read_form(reader: Reader): t.MalType {
    // logger('read_form', reader.peek());
    switch (reader.peek()) {
        case null:
            throw new Error('Hit EOF, unable to read form');
        case '(':
            return read_list(reader, 'list', ')');
        case '[':
            return read_list(reader, 'vec', ']');
        case '{':
            return read_list(reader, 'map', '}');
        default:
            return read_atom(reader);
    }
}

function read_list(
    reader: Reader,
    type: 'list' | 'map' | 'vec',
    end: string,
): t.MalType {
    const list: t.MalType[] = [];
    reader.next();
    for (;;) {
        const token = reader.peek();
        if (token == null) {
            throw new Error('Hit EOF, unexpected end of list');
        }
        if (token === end) {
            reader.next();
            break;
        }
        list.push(read_form(reader));
    }

    if (type === 'list' || type === 'vec') {
        return { type, value: list };
    }

    return t.map(list);
}

function read_atom(reader: Reader): t.MalType {
    const token = reader.next();
    if (token == null) {
        throw new Error('Hit EOF, unable to read atom');
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
        return t.str(parse_str(token));
    }

    if (token.startsWith("'")) return read_wrapped(reader, 'quote');
    if (token.startsWith('`')) return read_wrapped(reader, 'quasiquote');
    if (token.startsWith('~@')) return read_wrapped(reader, 'splice-unquote');
    if (token.startsWith('~')) return read_wrapped(reader, 'unquote');
    if (token.startsWith('@')) return read_wrapped(reader, 'deref');

    if (token[0] === '^') {
        const meta = read_form(reader);
        const value = read_form(reader);
        return t.list(t.sym('with-meta'), value, meta);
    }

    return t.sym(token);
}

function read_wrapped(reader: Reader, wrapper: string): t.MalType {
    return t.list(t.sym(wrapper), read_form(reader));
}

function parse_str(token: string): string {
    try {
        return JSON.parse(token.replace(/\n/, '\\n'));
    } catch (_) {
        throw new Error('Hit EOF, unexpected end of string');
    }
}
