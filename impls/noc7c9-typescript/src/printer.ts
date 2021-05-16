import { MalType } from './types';

export function print_str(input: MalType): string {
    switch (input.type) {
        case 'nil':
            return 'nil';
        case 'bool':
        case 'int':
        case 'sym':
            return `${input.value}`;
        case 'str':
            return JSON.stringify(input.value);
        case 'list':
            return `(${input.value.map(print_str).join(' ')})`;
        case 'map':
            return `{${input.value
                .map(([k, v]) => `${print_str(k)} ${print_str(v)}`)
                .join(' ')}}`;
        case 'vec':
            return `[${input.value.map(print_str).join(' ')}]`;
    }
}
