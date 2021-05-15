import * as readline from 'readline';

export const initialize = (prompt: string) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt,
    });

    return (): Promise<string | null> =>
        new Promise((resolve) => {
            rl.prompt();
            rl.once('close', () => resolve(null));
            rl.once('line', (line) => resolve(line));
        });
};
