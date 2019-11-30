use crate::ast::{self, AST};
use std::collections::HashMap;

pub fn print(exp: AST) -> String {
    let mut string = String::new();
    match exp {
        AST::List(value) => {
            string.push('(');
            let value: Vec<_> = value.into_iter().map(print).collect();
            string.push_str(&value.join(" "));
            string.push(')');
        }
        AST::Vector(value) => {
            string.push('[');
            let value: Vec<_> = value.into_iter().map(print).collect();
            string.push_str(&value.join(" "));
            string.push(']');
        }
        AST::HashMap(value) => {
            string.push('{');
            string.push_str(&print_hashmap(value));
            string.push('}');
        }
        AST::Keyword(value) => {
            string.push(':');
            string.push_str(&value);
        }
        AST::Symbol(value) => string.push_str(&value),
        AST::String(value) => {
            string.push('"');
            string.push_str(&print_string(value));
            string.push('"');
        }
        AST::Bool(value) => string.push_str(&value.to_string()),
        AST::Number(value) => string.push_str(&value.to_string()),
        AST::Nil => string.push_str("nil"),
    }
    string
}

fn print_hashmap(hash_map: HashMap<ast::Hashable, AST>) -> String {
    let pairs: Vec<_> = hash_map
        .into_iter()
        .map(|(key, value)| format!("{} {}", print(key.into()), print(value)))
        .collect();
    pairs.join(" ")
}

fn print_string(string: String) -> String {
    let mut result = String::new();
    for ch in string.chars() {
        match ch {
            '"' | '\\' => {
                result.push('\\');
                result.push(ch);
            }
            '\n' => {
                result.push('\\');
                result.push('n');
            }
            '\t' => {
                result.push('\\');
                result.push('t');
            }
            ch => result.push(ch),
        }
    }
    result
}
