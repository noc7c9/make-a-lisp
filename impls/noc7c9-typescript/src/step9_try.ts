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

function quasiquote(ast: t.MalType): t.MalType {
    if (ast.type === 'list') {
        if (ast.value.length === 0) {
            return ast;
        }
        if (ast.value[0].value === 'unquote') {
            return ast.value[1];
        }

        let result: t.MalList = t.list();
        for (let i = ast.value.length - 1; i >= 0; i -= 1) {
            const elt = ast.value[i];
            if (
                elt.type === 'list' &&
                elt.value[0]?.value === 'splice-unquote'
            ) {
                result = t.list(t.sym('concat'), elt.value[1], result);
            } else {
                result = t.list(t.sym('cons'), quasiquote(elt), result);
            }
        }
        return result;
    }

    if (ast.type === 'vec') {
        let result: t.MalList = t.list();
        for (let i = ast.value.length - 1; i >= 0; i -= 1) {
            const elt = ast.value[i];
            if (
                elt.type === 'list' &&
                elt.value[0]?.value === 'splice-unquote'
            ) {
                result = t.list(t.sym('concat'), elt.value[1], result);
            } else {
                result = t.list(t.sym('cons'), quasiquote(elt), result);
            }
        }
        return t.list(t.sym('vec'), result);
    }

    if (ast.type === 'map' || ast.type === 'sym') {
        return t.list(t.sym('quote'), ast);
    }

    return ast;
}

function isMacroCall(ast: t.MalType, env: envM.Env): boolean {
    if (ast.type !== 'list') return false;
    const first = ast.value[0];
    if (first == null || first.type != 'sym') return false;
    const resolved = env.find(first);
    if (resolved == null || resolved.type !== 'fn') return false;
    return resolved.value.isMacro;
}

function macroExpand(ast: t.MalType, env: envM.Env): t.MalType {
    while (isMacroCall(ast, env)) {
        const macro = t.isFn(env.get(t.isSym(t.isList(ast).value[0]))).value;
        const args = t.isListOrVec(ast).value.slice(1);
        ast = macro.call(...args);
    }
    return ast;
}

function eval_(ast: t.MalType, env: envM.Env): t.MalType {
    for (;;) {
        logger.log(
            'eval\n  AST = %s\n  ENV = %s',
            printer.printStr(ast, true),
            env.log(2),
        );

        if (ast.type !== 'list') {
            return evalAst(ast, env);
        }

        ast = macroExpand(ast, env);

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
            case 'defmacro!': {
                const sym = t.isSym(ast.value[1]);
                const fn = t.isFn(eval_(ast.value[2], env));
                if (fn.value.type === 'native') {
                    throw t.str('Cannot make native function into a macro');
                }
                const macro: t.MalFn = {
                    type: 'fn',
                    value: {
                        ...fn.value,
                        name: sym.value,
                        isMacro: true,
                    },
                };
                env.set(sym, macro);
                return macro;
            }
            case 'let*': {
                const letEnv = envM.init(env);
                const bindings = t.isListOrVec(ast.value[1]).value;
                for (let i = 0; i < bindings.length; i += 2) {
                    const sym = t.isSym(bindings[i]);
                    const val = eval_(bindings[i + 1], letEnv);
                    letEnv.set(sym, val);
                }
                // TCO
                ast = ast.value[2];
                env = letEnv;
                continue;
            }
            case 'do': {
                let result;
                const len = ast.value.length;
                for (let i = 1; i < len - 1; i += 1) {
                    result = eval_(ast.value[i], env);
                }
                // TCO
                ast = ast.value[len - 1];
                continue;
            }
            case 'if': {
                const cond = eval_(ast.value[1], env).value;
                if (cond !== false && cond !== null) {
                    // TCO
                    ast = ast.value[2];
                } else if (ast.value[3] == null) {
                    return t.nil();
                } else {
                    // TCO
                    ast = ast.value[3];
                }
                continue;
            }
            case 'fn*': {
                const params = t.isListOrVec(ast.value[1]);
                ast = ast.value[2];
                return t.fn({
                    type: 'mal',
                    env,
                    params,
                    ast,
                    call: (...args) => {
                        const binds = params.value.map(t.isSym);
                        const fnEnv = envM.init(env, binds, args);
                        return eval_(ast, fnEnv);
                    },
                    isMacro: false,
                    [logger.custom]: () =>
                        logger.inspect({ params, env: '..elided..', ast }),
                });
            }
            case 'quote':
                return ast.value[1];
            case 'quasiquoteexpand':
                return quasiquote(ast.value[1]);
            case 'quasiquote': {
                // TCO
                ast = quasiquote(ast.value[1]);
                continue;
            }
            case 'macroexpand':
                return macroExpand(ast.value[1], env);
            case 'try*': {
                try {
                    return eval_(ast.value[1], env);
                } catch (err) {
                    if (err instanceof Error) throw err;
                    const catchEnv = envM.init(env);
                    if (ast.value[2] == null) throw err;
                    const catchAst = t.isListOrVec(ast.value[2]);
                    catchEnv.set(t.isSym(catchAst.value[1]), err);
                    return eval_(catchAst.value[2], catchEnv);
                }
            }
            default: {
                const evaled = evalAst(ast, env) as t.MalList;
                const fn = t.isFn(evaled.value[0]);
                const args = evaled.value.slice(1);

                let result;
                if (fn.value.type === 'native') {
                    return fn.value.call(...args);
                } else {
                    const binds = t
                        .isListOrVec(fn.value.params)
                        .value.map(t.isSym);
                    // TCO
                    ast = fn.value.ast;
                    env = envM.init(fn.value.env, binds, args);
                    continue;
                }
            }
        }
    }
}

function print(ast: t.MalType): string {
    return printer.printStr(ast, true);
}

function buildReplEnv(argv: string[]): envM.Env {
    const coreEnv = envM.init(null);
    const replEnv = envM.init(coreEnv);

    Object.entries(core.ns).forEach(([name, fn]) =>
        coreEnv.set(t.sym(name), t.fnNative(name, fn)),
    );
    coreEnv.set(
        t.sym('eval'),
        t.fnNative('eval', (arg) => eval_(arg, replEnv)),
    );

    eval_(read('(def! not (fn* (a) (if a false true)))')!, coreEnv);
    const loadFile =
        '(def! load-file (fn* (f) (eval (read-string (str "(do " (slurp f) "\nnil)")))))';
    eval_(read(loadFile)!, coreEnv);
    const cond =
        '(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list \'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw "odd number of forms to cond")) (cons \'cond (rest (rest xs)))))))';
    eval_(read(cond)!, coreEnv);

    coreEnv.set(t.sym('*ARGV*'), t.list(...argv.slice(1).map(t.str)));

    // elide the core env when logging
    coreEnv.log = () => 'core.ns';

    return replEnv;
}

(function main() {
    const args = process.argv.slice(2);

    const DEBUG_backup = process.env.DEBUG;
    process.env.DEBUG = undefined;
    const replEnv = buildReplEnv(args);
    process.env.DEBUG = DEBUG_backup;

    if (args.length > 0) {
        try {
            const input = `(load-file "${args[0]}")`;
            const readLine = read(input);
            const evalLine = eval_(readLine, replEnv);
            print(evalLine);
        } catch (err) {
            if (err !== REPL_CONTINUE) {
                if (err instanceof Error) throw err;
                console.error('Error:', printer.printStr(err, true));
            }
        }
        process.exit(0);
    }

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
