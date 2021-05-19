import * as t from './types';
import * as logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';

const REPL_CONTINUE = Symbol('REPL_CONTINUE');

function read(line: string): t.MalType {
    const ast = reader.readStr(line);
    if (ast == null) {
        throw REPL_CONTINUE;
    }
    return ast;
}

function evalAst(ast: t.MalType, env: Env): t.MalType {
    switch (ast.type) {
        case 'sym': {
            if (ast.value in env) {
                (ast as any).resolved = env[ast.value];
                return ast;
            }
            throw t.str(`Hit unknown symbol \`${ast.value}\``);
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

function eval_(ast: t.MalType, env: Env): t.MalType {
    logger.log(
        'eval\n  AST = %s\n  ENV = %s',
        printer.printStr(ast, true),
        env,
    );

    if (ast.type !== 'list') {
        return evalAst(ast, env);
    }

    if (ast.value.length === 0) {
        return ast;
    }
    const evaled = evalAst(ast, env) as t.MalList;
    const fn = evaled.value[0] as t.MalSym;
    const args = evaled.value
        .slice(1)
        .map((a) => ('value' in a ? a.value : null));
    const result = (fn as any).resolved(...args);
    return { type: 'int', value: result };
}

function print(ast: t.MalType): string {
    return printer.printStr(ast, true);
}

type Fn = (a: number, b: number) => number;
type Env = Record<string, Fn>;
const replEnv: Env = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.floor(a / b),
};

(function main() {
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
