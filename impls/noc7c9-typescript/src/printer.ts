import logger from './logger';
import { MalType } from './types';

export function print_str(input: MalType, print_readably: boolean): string {
    // logger('print_str(%s)', input);
    switch (input.type) {
        case 'nil':
            return 'nil';
        case 'bool':
        case 'int':
        case 'sym':
        case 'key':
            return `${input.value}`;
        case 'str':
            return print_readably ? JSON.stringify(input.value) : input.value;
        case 'atom':
            return `(atom ${print_str(input.value, print_readably)})`;
        case 'list':
            return `(${input.value
                .map((v) => print_str(v, print_readably))
                .join(' ')})`;
        case 'map':
            return `{${input.value
                .map(([k, v]) => {
                    const ks = print_str(k, print_readably);
                    const vs = print_str(v, print_readably);
                    return `${ks} ${vs}`;
                })
                .join(' ')}}`;
        case 'vec':
            return `[${input.value
                .map((v) => print_str(v, print_readably))
                .join(' ')}]`;
        case 'fn':
            if (typeof input.value === 'function') {
                if ('name' in input.value && input.value.name) {
                    return `#<builtin ${input.value.name}>`;
                }
                return `#<builtin>`;
            } else {
                const name = input.value.name || '_';
                const params = print_str(input.value.params, print_readably);
                const body = print_str(input.value.ast, print_readably);
                if (input.value.is_macro) {
                    return `(defmacro! ${name} (fn* ${params} ${body}))`;
                } else {
                    return `(def! ${name} (fn* ${params} ${body}))`;
                }
            }
    }
}
