use mal::{ast::AST, error::Error, printer, reader, readline};

fn read(string: &str) -> Result<AST, Error> {
    reader::read(string)
}

fn eval(ast: AST, _env: &str) -> Result<AST, Error> {
    Ok(ast)
}

fn print(exp: AST) -> Result<String, Error> {
    Ok(printer::print(exp))
}

fn rep(string: &str) -> Result<String, Error> {
    print(eval(read(string)?, "")?)
}

fn main() {
    let mut prompt = readline::Prompt::new();

    while let Some(line) = prompt.readline("user> ") {
        match rep(&line) {
            Ok(result) => println!("{}", result),
            Err(Error::EmptyInput) => {}
            Err(err) => eprintln!("{}", err),
        }
    }
}
