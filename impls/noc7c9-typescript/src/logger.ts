import * as util from 'util';

const logger = (...args: unknown[]) => {
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

const inspect = (value: unknown) =>
    util.inspect(value, { depth: Infinity, colors: true });

export default Object.assign(logger, { inspect });
