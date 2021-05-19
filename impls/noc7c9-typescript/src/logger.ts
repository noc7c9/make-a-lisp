import * as util from 'util';

export const log = (...args: unknown[]) => {
    if (process.env.DEBUG !== 'true') {
        return;
    }
    const [first, ...rest] = args;
    if (typeof first === 'string' && /%s/.test(first)) {
        console.error(inspectNonStr(first), ...rest.map(inspectNonStr));
    } else {
        console.error(...args.map(inspectNonStr));
    }
};

const inspectNonStr = (value: unknown) =>
    typeof value === 'string' ? value : inspect(value);

export const inspect = (value: unknown) =>
    util.inspect(value, { depth: Infinity, colors: true });

export const custom = util.inspect.custom;
