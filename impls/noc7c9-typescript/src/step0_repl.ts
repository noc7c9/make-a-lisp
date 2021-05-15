import * as readline from './readline';

function read(line: string): string {
    return line;
}

function eval_(line: string): string {
    return line;
}

function print(line: string): string {
    return line;
}

(async function main() {
    const rl = readline.initialize('user> ');

    let line;
    while ((line = await rl())) {
        line = read(line);
        line = eval_(line);
        line = print(line);
        console.log(line);
    }
})();
