import path from 'path';
import fs from 'fs';
import * as readline from 'readline';

const HISTORY_FILE = path.join(process.env.HOME || '.', '.mal-history');

export const initialize = (prompt: string) => {
    const history_fd = fs.openSync(HISTORY_FILE, 'a+');
    const history = fs
        .readFileSync(history_fd, 'utf8')
        .trim()
        .split('\n')
        .reverse();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt,
        history,
        removeHistoryDuplicates: true,
    } as any); // @types/node@15.3.0 doesn't have necessary types

    let last = history[0];
    rl.on('history', (history) => {
        if (history[0] === last) return;
        last = history[0];
        fs.appendFileSync(history_fd, history[0], 'utf8');
        fs.appendFileSync(history_fd, '\n', 'utf8');
    });

    return (): Promise<string | null> =>
        new Promise((resolve) => {
            rl.prompt();
            const onClose = () => {
                rl.off('line', onLine);
                resolve(null);
            };
            const onLine = (line: string) => {
                rl.off('close', onClose);
                resolve(line);
            };
            rl.once('close', onClose);
            rl.once('line', onLine);
        });
};
