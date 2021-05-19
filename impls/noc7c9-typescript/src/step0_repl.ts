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

(function main() {
    const prompt = readline.initialize('user> ');
    let line;
    while ((line = prompt()) != null) {
        line = read(line);
        line = eval_(line);
        line = print(line);
        console.log(line);
    }

    process.exit(0);
})();
