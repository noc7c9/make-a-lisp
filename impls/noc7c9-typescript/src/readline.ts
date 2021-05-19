import path from 'path';
import fs from 'fs';
// @ts-ignore
import * as deasync from 'deasync';
import * as readline from 'readline';

const HISTORY_FILE = path.join(process.env.HOME || '.', '.mal-history');

let rl: readline.ReadLine;

export const initialize = (promptStr: string) => {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        removeHistoryDuplicates: true,
    });
    return () => prompt(promptStr);

    // const historyFd = fs.openSync(HISTORY_FILE, 'a+');
    // const history = fs
    //     .readFileSync(historyFd, 'utf8')
    //     .trim()
    //     .split('\n')
    //     .reverse();

    // rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout,
    //     history,
    //     removeHistoryDuplicates: true,
    // } as any); // @types/node@15.3.0 doesn't have necessary types

    // let lastLine: string | null = history[0] ?? null;
    // return (): string | null => {
    //     const line = prompt(promptStr);
    //     if (line != null && line != lastLine) {
    //         fs.appendFileSync(historyFd, line, 'utf8');
    //         fs.appendFileSync(historyFd, '\n', 'utf8');
    //         lastLine = line;
    //     }
    //     return line;
    // };
};

export const prompt = (prompt: string): string | null => {
    if (rl == null) {
        initialize(prompt);
    }

    let complete = false;
    let result: string | null;

    const onClose = () => {
        rl.off('line', onLine);
        process.stdout.write('\n');
        result = null;
        complete = true;
        initialize(prompt);
    };
    const onLine = (line: string) => {
        rl.off('close', onClose);
        result = line;
        complete = true;
    };
    rl.once('close', onClose);
    rl.once('line', onLine);

    rl.setPrompt(prompt);
    rl.prompt();

    deasync.loopWhile(() => !complete);

    // @ts-ignore
    return result;
};
