import { MalType, MalList, MalSym } from './types';
import logger from './logger';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';

function read(line: string): MalType | null {
    return reader.read_str(line);
}

function eval_ast(ast: MalType, env: Env): MalType {
    switch (ast.type) {
        case 'sym': {
            if (ast.value in env) {
                (ast as any).resolved = env[ast.value];
                return ast;
            }
            throw new Error(`Hit unknown symbol \`${ast.value}\``);
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

function eval_(ast: MalType, env: Env): MalType {
    logger('eval_(%s, %s)', ast, env);

    if (ast.type !== 'list') {
        return eval_ast(ast, env);
    }
    if (ast.value.length === 0) {
        return ast;
    }
    const evaled = eval_ast(ast, env) as MalList;
    const fn = evaled.value[0] as MalSym;
    const args = evaled.value
        .slice(1)
        .map((a) => ('value' in a ? a.value : null));
    const result = (fn as any).resolved(...args);
    logger(
        `call %s(%s) => %s`,
        'value' in fn ? fn.value : 'nil',
        args.join(', '),
        result,
    );
    return { type: 'int', value: result };
}

function print(ast: MalType): string {
    return printer.print_str(ast);
}

type Function = (a: number, b: number) => number;
type Env = Record<string, Function>;
const repl_env: Env = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.floor(a / b),
};

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
