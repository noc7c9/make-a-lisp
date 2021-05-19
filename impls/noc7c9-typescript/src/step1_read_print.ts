import * as t from './types';
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

function eval_(ast: t.MalType): t.MalType {
    return ast;
}

function print(ast: t.MalType): string {
    return printer.printStr(ast, true);
}

(function main() {
    const prompt = readline.initialize('user> ');
    let line;
    while ((line = prompt()) != null) {
        try {
            line = read(line);
            line = eval_(line);
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
