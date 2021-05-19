import * as t from './types';
import * as logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';
import * as envM from './env';
import * as core from './core';

const REPL_CONTINUE = Symbol('REPL_CONTINUE');

function read(line: string): t.MalType {
    const ast = reader.readStr(line);
    if (ast == null) {
        throw REPL_CONTINUE;
    }
    return ast;
}

function evalAst(ast: t.MalType, env: envM.Env): t.MalType {
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
        case 'map': {
            const value: t.MalMap['value'] = {};
            Object.entries(ast.value).forEach(([key, val]) => {
                value[key] = eval_(val, env);
            });
            return { type: 'map', value };
        }
        default:
            return ast;
    }
}

function eval_(ast: t.MalType, env: envM.Env): t.MalType {
    logger.log(
        'eval\n  AST = %s\n  ENV = %s',
        printer.printStr(ast, true),
        env.log(2),
    );

    if (ast.type !== 'list') {
        return evalAst(ast, env);
    }

    if (ast.value.length === 0) {
        return ast;
    }

    switch (ast.value[0].value) {
        case 'def!': {
            const sym = t.isSym(ast.value[1]);
            const value = eval_(ast.value[2], env);
            if (value.type === 'fn' && typeof value.value !== 'function') {
                value.value.name = sym.value;
            }
            env.set(sym, value);
            return value;
        }
        case 'let*': {
            const letEnv = envM.init(env);
            const bindings = t.isListOrVec(ast.value[1]).value;
            for (let i = 0; i < bindings.length; i += 2) {
                const sym = t.isSym(bindings[i]);
                const val = eval_(bindings[i + 1], letEnv);
                letEnv.set(sym, val);
            }
            return eval_(ast.value[2], letEnv);
        }
        case 'do': {
            let result;
            for (let i = 1; i < ast.value.length; i += 1) {
                result = eval_(ast.value[i], env);
            }
            return result || t.nil();
        }
        case 'if': {
            const cond = eval_(ast.value[1], env).value;
            const first = ast.value[2];
            const second = ast.value[3];
            logger.log({ cond, result: cond !== false || cond !== null });
            return cond !== false && cond !== null
                ? eval_(first, env)
                : second == null
                ? t.nil()
                : eval_(second, env);
        }
        case 'fn*': {
            return t.fnNative('', (...args) => {
                const binds = t.isListOrVec(ast.value[1]).value.map(t.isSym);
                const fnEnv = envM.init(env, binds, args);
                return eval_(ast.value[2], fnEnv);
            });
        }
        default: {
            const evaled = evalAst(ast, env) as t.MalList;
            const fn = t.isFn(evaled.value[0]);
            const args = evaled.value.slice(1);
            return fn.value.call(...args);
        }
    }
}

function print(ast: t.MalType): string {
    return printer.printStr(ast, true);
}

function buildReplEnv(): envM.Env {
    const coreEnv = envM.init(null);
    const replEnv = envM.init(coreEnv);

    Object.entries(core.ns).forEach(([name, fn]) =>
        coreEnv.set(t.sym(name), t.fnNative(name, fn)),
    );

    eval_(read('(def! not (fn* (a) (if a false true)))')!, coreEnv);

    // elide the core env when logging
    coreEnv.log = () => 'core.ns';

    return replEnv;
}

(function main() {
    const DEBUG_backup = process.env.DEBUG;
    process.env.DEBUG = undefined;
    const replEnv = buildReplEnv();
    process.env.DEBUG = DEBUG_backup;

    const prompt = readline.initialize('user> ');
    let line;
    while ((line = prompt()) != null) {
        try {
            line = read(line);
            line = eval_(line, replEnv);
            line = print(line);
            console.log(line);
        } catch (err) {
            if (err === REPL_CONTINUE) continue;
            if (err instanceof Error) throw err;
            console.error('Error:', printer.printStr(err, true));
        }
    }

    process.exit(0);
})();
