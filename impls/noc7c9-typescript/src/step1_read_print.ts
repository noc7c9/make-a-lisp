import { MalType } from './types';
import * as readline from './readline';
import * as reader from './reader';
import * as printer from './printer';

function read(line: string): MalType | null {
    return reader.read_str(line);
}

function eval_(ast: MalType): MalType {
    return ast;
}

function print(ast: MalType): string {
    return printer.print_str(ast, true);
}

(async function main() {
    const rl = readline.initialize('user> ');

    let line;
    while ((line = await rl())) {
        try {
            line = read(line);
            if (line == null) continue;
            line = eval_(line);
            line = print(line);
            console.log(line);
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
})();
