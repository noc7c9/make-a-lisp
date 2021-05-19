import * as t from './types';
import * as logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';
import * as envM from './env';

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

    const setFn = (name: string, fn: t.MalFn['value']['call']) =>
        coreEnv.set(t.sym(name), t.fnNative(name, fn));

    setFn('+', (a, b) => t.int(t.toInt(a) + t.toInt(b)));
    setFn('-', (a, b) => t.int(t.toInt(a) - t.toInt(b)));
    setFn('*', (a, b) => t.int(t.toInt(a) * t.toInt(b)));
    setFn('/', (a, b) => t.int(Math.floor(t.toInt(a) / t.toInt(b))));

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
