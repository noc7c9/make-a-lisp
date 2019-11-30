use crate::ast::{self, AST};
use crate::error::Error;
use std::collections::HashMap;
use std::convert::TryInto;

type TokenIter<'a> = std::iter::Peekable<std::vec::IntoIter<&'a str>>;

pub fn read(string: &str) -> Result<AST, Error> {
    let mut tokens = tokenize(string);

    // Handle the special case where there are no tokens (eg only a comment)
    if tokens.peek().is_none() {
        return Err(Error::EmptyInput);
    }

    read_form(&mut tokens)
}

fn read_form(tokens: &mut TokenIter) -> Result<AST, Error> {
    let form = match tokens.peek() {
        // Container forms
        Some(&"(") => {
            tokens.next();
            read_container(tokens, ast::Container::List)?
        }
        Some(&"[") => {
            tokens.next();
            read_container(tokens, ast::Container::Vector)?
        }
        Some(&"{") => {
            tokens.next();
            read_container(tokens, ast::Container::HashMap)?
        }

        // Reader macros
        Some(&"'") => {
            tokens.next();
            AST::List(vec![AST::Symbol("quote".into()), read_form(tokens)?])
        }
        Some(&"`") => {
            tokens.next();
            AST::List(vec![AST::Symbol("quasiquote".into()), read_form(tokens)?])
        }
        Some(&"~") => {
            tokens.next();
            AST::List(vec![AST::Symbol("unquote".into()), read_form(tokens)?])
        }
        Some(&"@") => {
            tokens.next();
            AST::List(vec![AST::Symbol("deref".into()), read_form(tokens)?])
        }
        Some(&"~@") => {
            tokens.next();
            AST::List(vec![
                AST::Symbol("splice-unquote".into()),
                read_form(tokens)?,
            ])
        }
        Some(&"^") => {
            tokens.next();
            let first_form = read_form(tokens)?;
            let second_form = read_form(tokens)?;
            AST::List(vec![
                AST::Symbol("with-meta".into()),
                second_form,
                first_form,
            ])
        }

        _ => read_atom(tokens)?,
    };
    Ok(form)
}

fn read_container(tokens: &mut TokenIter, container_type: ast::Container) -> Result<AST, Error> {
    let end_ch = match container_type {
        ast::Container::List => ")",
        ast::Container::Vector => "]",
        ast::Container::HashMap => "}",
    };

    let mut values = vec![];
    loop {
        if tokens.peek().ok_or(Error::UnbalancedCollection)? == &end_ch {
            tokens.next();
            break;
        }
        values.push(read_form(tokens)?);
    }

    Ok(match container_type {
        ast::Container::List => AST::List(values),
        ast::Container::Vector => AST::Vector(values),
        ast::Container::HashMap => {
            let mut hash_map = HashMap::with_capacity(values.len() / 2);

            let mut pairs = values.into_iter().peekable();
            while let Some(key) = pairs.next() {
                let value = pairs.next().ok_or(Error::MissingHashMapValue)?;
                hash_map.insert(key.try_into()?, value);
            }

            AST::HashMap(hash_map)
        }
    })
}

fn read_atom(tokens: &mut TokenIter) -> Result<AST, Error> {
    let token = tokens.next().ok_or(Error::MissingAtom)?;

    // Read a number
    let atom = if let Ok(num) = token.parse::<f64>() {
        AST::Number(num)
    }
    // Read a string
    else if token.starts_with('"') {
        read_string(token)?
    }
    // Read a keyword
    else if token.starts_with(':') {
        AST::Keyword(token[1..].into())
    }
    // Read a symbol
    else {
        AST::Symbol(token.into())
    };

    Ok(atom)
}

fn read_string(token: &str) -> Result<AST, Error> {
    let mut string = String::new();

    let mut chars = token.chars().skip(1);
    loop {
        match chars.next().ok_or(Error::UnbalancedString)? {
            '\"' => break,
            '\\' => match chars.next().ok_or(Error::UnbalancedString)? {
                '"' => string.push('\"'),
                '\\' => string.push('\\'),
                'n' => string.push('\n'),
                't' => string.push('\t'),
                ch => string.push(ch),
            },
            ch => string.push(ch),
        }
    }

    Ok(AST::String(string))
}

fn tokenize(string: &str) -> TokenIter<'_> {
    let mut tokens = Vec::new();
    let mut chars = string.chars().enumerate().peekable();

    while let Some((idx, ch)) = chars.next() {
        let peek = chars.peek().map(|(_, ch)| ch);

        // Matching whitespace and commas
        if ch == ',' || ch.is_whitespace() {
            // skip these characters
        }
        // Matching the ~@ two character token
        else if (ch, peek) == ('~', Some(&'@')) {
            tokens.push(&string[idx..idx + 2]);
            chars.next();
        }
        // Matching single special characters
        else if "[]{}()'`~^@".contains(ch) {
            tokens.push(&string[idx..=idx]);
        }
        // Matching strings
        else if ch == '"' {
            tokens.push(tokenize_string(idx, &mut chars, string));
        }
        // Matching comments
        else if ch == ';' {
            break;
        }
        // Matching misc tokens
        else {
            tokens.push(tokenize_misc(idx, &mut chars, string));
        }
    }

    tokens.into_iter().peekable()
}

fn tokenize_string<'a>(
    start_idx: usize,
    chars: &mut std::iter::Peekable<std::iter::Enumerate<std::str::Chars<'_>>>,
    string: &'a str,
) -> &'a str {
    loop {
        match chars.next() {
            None => return &string[start_idx..],
            Some((idx, '"')) => return &string[start_idx..=idx],
            Some((_, '\\')) => {
                chars.next();
            }
            _ => {}
        }
    }
}

fn tokenize_misc<'a>(
    start_idx: usize,
    chars: &mut std::iter::Peekable<std::iter::Enumerate<std::str::Chars<'_>>>,
    string: &'a str,
) -> &'a str {
    loop {
        match chars.peek() {
            None => return &string[start_idx..],
            Some((idx, ch)) => {
                if ",;\"[]{}()'`".contains(*ch) || ch.is_whitespace() {
                    return &string[start_idx..*idx];
                }
                chars.next();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    mod tokenize {
        macro_rules! test {
            ($name:ident $($input:expr => [$($expected:expr),*])+) => {
                #[test]
                fn $name() {
                    $({
                        let actual: Vec<&str> = crate::reader::tokenize($input).collect();
                        let expected: Vec<&str> = vec![$($expected),*];
                        assert_eq!(actual, expected);
                    })+
                }
            };
        }

        test! { empty_string
            "" => []
        }

        test! { special_single_characters
            "[]{}()'`~^@"
                => ["[", "]", "{", "}", "(", ")", "'", "`", "~", "^", "@"]
            "[ ] { } ( ) ' ` ~ ^ @"
                => ["[", "]", "{", "}", "(", ")", "'", "`", "~", "^", "@"]
            "   [   ]   {   }   (     )       ' `       ~ ^     @   "
                => ["[", "]", "{", "}", "(", ")", "'", "`", "~", "^", "@"]
        }

        test! { special_two_char
            "~@" => ["~@"]
            "~ @" => ["~", "@"]
            "  ~      @   " => ["~", "@"]
        }

        test! { empty_strings
            r#""""# => [r#""""#]
            r#" "" "" "# => [r#""""#, r#""""#]
        }

        test! { basic_strings
            r#" "abc" "# => [r#""abc""#]
            r#" "abc" "123" "($)" "# => [r#""abc""#, r#""123""#, r#""($)""#]
            r#" "'''" "# => [r#""'''""#]
        }

        test! { strings_with_escaped_quotes
            r#" "\"" "# => [r#""\"""#]
            r#" "\"" "\"\"" "\"\"\"" "# => [r#""\"""#, r#""\"\"""#, r#""\"\"\"""#]
        }

        test! { strings_with_escaped_characters
            r#""\"""# => [r#""\"""#]
            r#""\n""# => [r#""\n""#]
            r#""\\""# => [r#""\\""#]
            r#" "\"" "\n\\" "\\\n\"" "# => [r#""\"""#, r#""\n\\""#, r#""\\\n\"""#]
        }

        test! { comments
            " ; abc 123" => ["; abc 123"]
            " ; ;;;   \"\" '   !@$ " => ["; ;;;   \"\" '   !@$ "]
        }

        test! { misc_tokens
            "nil" => ["nil"]
            "true false" => ["true", "false"]
            "ident ifier" => ["ident", "ifier"]
            "123 -543.21" => ["123", "-543.21"]
            "   true   nil false  123 " => ["true", "nil", "false", "123"]
            " truenil false123   " => ["truenil", "false123"]
        }

        test! { commas_as_whitespace
            "nil,,," => ["nil"]
            ",,true,,false,," => ["true", "false"]
        }
    }
}
