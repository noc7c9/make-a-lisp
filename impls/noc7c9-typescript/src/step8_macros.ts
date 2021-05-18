import type { MalType, MalFn, MalList, MalSym, FnTco } from './types';
import * as t from './types';
import logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';
import * as envM from './env';
import * as core from './core';

const REPL_CONTINUE = Symbol('REPL_CONTINUE');

function read(line: string): MalType {
    const ast = reader.read_str(line);
    if (ast == null) {
        throw REPL_CONTINUE;
    }
    return ast;
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

function quasiquote(ast: MalType): MalType {
    if (ast.type === 'list') {
        if (ast.value.length === 0) {
            return ast;
        }
        if (ast.value[0].value === 'unquote') {
            return ast.value[1];
        }

        let result: MalList = t.list();
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
        let result: MalList = t.list();
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

function is_macro_call(ast: MalType, env: envM.Env): boolean {
    if (ast.type !== 'list') return false;
    const first = ast.value[0];
    if (first == null || first.type != 'sym') return false;
    const resolved = env.find(first);
    if (resolved == null || resolved.type !== 'fn') return false;
    if (typeof resolved.value === 'function') return false;
    return resolved.value.is_macro;
}

function macroexpand(ast: MalType, env: envM.Env): MalType {
    while (is_macro_call(ast, env)) {
        const macro = t.isFn(env.get(t.isSym(t.isList(ast).value[0]))).value;
        const args = t.isListOrVec(ast).value.slice(1);
        ast = (macro as FnTco).fn(...args);
    }
    return ast;
}

function eval_(ast: MalType, env: envM.Env): MalType {
    for (;;) {
        // logger(
        //     'eval\n  AST = %s\n  ENV = %s',
        //     printer.print_str(ast, true),
        //     env.log(2),
        // );

        if (ast.type !== 'list') {
            return eval_ast(ast, env);
        }

        ast = macroexpand(ast, env);

        if (ast.type !== 'list') {
            return eval_ast(ast, env);
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
                const value = t.isFn(eval_(ast.value[2], env));
                (value.value as FnTco).name = sym.value;
                (value.value as FnTco).is_macro = true;
                env.set(sym, value);
                return value;
            }
            case 'let*': {
                const let_env = envM.init(env);
                const bindings = t.isListOrVec(ast.value[1]).value;
                for (let i = 0; i < bindings.length; i += 2) {
                    const sym = t.isSym(bindings[i]);
                    const val = eval_(bindings[i + 1], let_env);
                    let_env.set(sym, val);
                }
                // TCO
                ast = ast.value[2];
                env = let_env;
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
                    env,
                    params,
                    ast,
                    fn: (...args) => {
                        const binds = params.value.map(t.isSym);
                        const fn_env = envM.init(env, binds, args);
                        return eval_(ast, fn_env);
                    },
                    is_macro: false,
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
                return macroexpand(ast.value[1], env);
            default: {
                const evaled = eval_ast(ast, env) as MalList;
                const fn = t.isFn(evaled.value[0]);
                const args = evaled.value.slice(1);
                const stringfiedArgs = args.map(logger.inspect).join(', ');

                // logger('calling %s(%s)', fn.value, stringfiedArgs);

                let result;
                if (typeof fn.value === 'function') {
                    result = fn.value(...args);
                    // logger(
                    //     'called  %s(%s) => %s',
                    //     fn.value,
                    //     stringfiedArgs,
                    //     result,
                    // );
                    return result;
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

function print(ast: MalType): string {
    return printer.print_str(ast, true);
}

function core_env(): envM.Env {
    const env = envM.init(null);

    return env;
}

function build_repl_env(argv: string[]): envM.Env {
    const core_env = envM.init(null);
    const repl_env = envM.init(core_env);

    Object.entries(core.ns).forEach(([name, fn]) =>
        core_env.set(t.sym(name), t.fn(fn)),
    );
    core_env.set(
        t.sym('eval'),
        t.fn((arg) => eval_(arg, repl_env)),
    );

    eval_(read('(def! not (fn* (a) (if a false true)))')!, core_env);
    const load_file =
        '(def! load-file (fn* (f) (eval (read-string (str "(do " (slurp f) "\nnil)")))))';
    eval_(read(load_file)!, core_env);
    const cond =
        '(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list \'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw "odd number of forms to cond")) (cons \'cond (rest (rest xs)))))))';
    eval_(read(cond)!, core_env);

    core_env.set(t.sym('*ARGV*'), t.list(...argv.slice(1).map(t.str)));

    // elide the core env when logging
    core_env.log = () => 'core.ns';

    return repl_env;
}

(async function main() {
    const args = process.argv.slice(2);

    const DEBUG_bk = process.env.DEBUG;
    process.env.DEBUG = undefined;
    const repl_env = build_repl_env(args);
    process.env.DEBUG = DEBUG_bk;

    if (args.length > 0) {
        const input = `(load-file "${args[0]}")`;
        const read_line = read(input);
        if (read_line == null) process.exit(0);
        const eval_line = eval_(read_line, repl_env);
        print(eval_line);
        process.exit(0);
    }

    const rl = readline.initialize('user> ');
    let line;
    while ((line = await rl()) != null) {
        try {
            line = read(line);
            line = eval_(line, repl_env);
            line = print(line);
            console.log(line);
        } catch (err) {
            if (err === REPL_CONTINUE) {
                continue;
            }
            console.error('Error:', err.message);
        }
    }

    process.exit(0);
})();
