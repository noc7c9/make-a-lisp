import type { MalType, MalFn, MalList, MalSym } from './types';
import * as t from './types';
import logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';
import * as envM from './env';

function read(line: string): MalType | null {
    return reader.read_str(line);
}

function eval_ast(ast: MalType, env: envM.Env): MalType {
    switch (ast.type) {
        case 'sym': {
            return env.get(ast);
        }
        case 'list':
        case 'vec':
            return {
                type: ast.type,
                value: ast.value.map((value) => eval_(value, env)),
            };
        case 'map':
            return {
                type: 'map',
                value: ast.value.map(([key, val]) => [key, eval_(val, env)]),
            };
        default:
            return ast;
    }
}

function eval_(ast: MalType, env: envM.Env): MalType {
    logger('eval_(%s, %s)', ast, env);

    if (ast.type !== 'list') {
        return eval_ast(ast, env);
    }

    if (ast.value.length === 0) {
        return ast;
    }

    switch (ast.value[0].value) {
        case 'def!': {
            logger('def!', ast.value.slice(1));
            const sym = t.isSym(ast.value[1]);
            const value = eval_(ast.value[2], env);
            env.set(sym, value);
            return value;
        }
        case 'let*': {
            logger('let*', ast.value.slice(1));
            const let_env = envM.init(env);
            const bindings = (ast.value[1] as MalList).value;
            for (let i = 0; i < bindings.length; i += 2) {
                const sym = t.isSym(bindings[i]);
                const val = eval_(bindings[i + 1], let_env);
                let_env.set(sym, val);
            }
            return eval_(ast.value[2], let_env);
        }
        default: {
            const evaled = eval_ast(ast, env) as MalList;
            const fn = evaled.value[0] as MalFn;
            const args = evaled.value.slice(1);
            const stringfiedArgs = args.map(logger.inspect).join(', ');
            logger('calling %s(%s)', fn.value, stringfiedArgs);
            const result = fn.value(...args);
            logger('calling %s(%s) => %s', fn.value, stringfiedArgs, result);
            return result;
        }
    }
}

function print(ast: MalType): string {
    return printer.print_str(ast);
}

const repl_env = envM.init(null);
const setFn = (name: string, fn: MalFn['value']) =>
    repl_env.set(t.sym(name), t.fn(fn));

setFn('+', (a, b) => t.int(t.isInt(a) + t.isInt(b)));
setFn('-', (a, b) => t.int(t.isInt(a) - t.isInt(b)));
setFn('*', (a, b) => t.int(t.isInt(a) * t.isInt(b)));
setFn('/', (a, b) => t.int(Math.floor(t.isInt(a) / t.isInt(b))));

(async function main() {
    const rl = readline.initialize('user> ');

    let line;
    while ((line = await rl())) {
        try {
            line = read(line);
            if (line == null) continue;
            line = eval_(line, repl_env);
            line = print(line);
            console.log(line);
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
})();
