import type { MalType, MalFn, MalList, MalSym } from './types';
import * as t from './types';
import logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';
import * as envM from './env';
import * as core from './core';

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
            const bindings = t.isList(ast.value[1]).value;
            for (let i = 0; i < bindings.length; i += 2) {
                const sym = t.isSym(bindings[i]);
                const val = eval_(bindings[i + 1], let_env);
                let_env.set(sym, val);
            }
            return eval_(ast.value[2], let_env);
        }
        case 'do': {
            logger('do', ast.value.slice(1));
            let result;
            for (let i = 1; i < ast.value.length; i += 1) {
                result = eval_(ast.value[i], env);
            }
            return result || t.nil();
        }
        case 'if': {
            logger('if', ast.value.slice(1));
            const cond = eval_(ast.value[1], env).value;
            const first = ast.value[2];
            const second = ast.value[3];
            logger({ cond, result: cond !== false || cond !== null });
            return cond !== false && cond !== null
                ? eval_(first, env)
                : second == null
                ? t.nil()
                : eval_(second, env);
        }
        case 'fn*': {
            logger('fn*', ast.value.slice(1));
            return t.fn((...args) => {
                const binds = t.isListOrVec(ast.value[1]).value.map(t.isSym);
                const fn_env = envM.init(env, binds, args);
                return eval_(ast.value[2], fn_env);
            });
        }
        default: {
            const evaled = eval_ast(ast, env) as MalList;
            const fn = evaled.value[0] as MalFn;
            const args = evaled.value.slice(1);
            const stringfiedArgs = args.map(logger.inspect).join(', ');
            logger('calling %s(%s)', fn.value, stringfiedArgs);
            const result = (fn.value as any)(...args);
            logger('called  %s(%s) => %s', fn.value, stringfiedArgs, result);
            return result;
        }
    }
}

function print(ast: MalType): string {
    return printer.print_str(ast, true);
}

(async function main() {
    const repl_env = envM.init(null);

    const DEBUG_bk = process.env.DEBUG;
    process.env.DEBUG = undefined;
    Object.entries(core.ns).forEach(([name, fn]) =>
        repl_env.set(t.sym(name), t.fn(fn)),
    );
    Object.defineProperty(repl_env, logger.custom, { value: () => 'core.ns' });

    eval_(read('(def! not (fn* (a) (if a false true)))')!, repl_env);
    process.env.DEBUG = DEBUG_bk;

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
