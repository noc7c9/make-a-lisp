import * as t from './types';
import * as logger from './logger';

export function printStr(input: t.MalType, printReadably: boolean): string {
    // logger.log('printStr(%s)', input);
    switch (input.type) {
        case 'nil':
            return 'nil';
        case 'bool':
        case 'int':
        case 'sym':
        case 'key':
            return `${input.value}`;
        case 'str':
            return printReadably ? JSON.stringify(input.value) : input.value;
        case 'atom':
            return `(atom ${printStr(input.value, printReadably)})`;
        case 'list':
            return `(${input.value
                .map((v) => printStr(v, printReadably))
                .join(' ')})`;
        case 'map':
            return `{${Object.entries(input.value)
                .map(([k, v]) => {
                    const ks = printStr(t.mapKeyToMal(k), printReadably);
                    const vs = printStr(v, printReadably);
                    return `${ks} ${vs}`;
                })
                .join(' ')}}`;
        case 'vec':
            return `[${input.value
                .map((v) => printStr(v, printReadably))
                .join(' ')}]`;
        case 'fn':
            if (input.value.type === 'native') {
                if (input.value.name != null) {
                    return `#<builtin ${input.value.name}>`;
                }
                return `#<builtin>`;
            } else {
                const name = input.value.name || '_';
                const params = printStr(input.value.params, printReadably);
                const body = printStr(input.value.ast, printReadably);
                if (input.value.isMacro) {
                    return `(defmacro! ${name} (fn* ${params} ${body}))`;
                } else {
                    return `(def! ${name} (fn* ${params} ${body}))`;
                }
            }
    }
}
