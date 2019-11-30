use mal::readline;

fn read(string: &str) -> &str {
    string
}

fn eval<'a>(ast: &'a str, _env: &str) -> &'a str {
    ast
}

fn print(exp: &str) -> &str {
    exp
}

fn rep(string: &str) -> &str {
    print(eval(read(string), ""))
}

fn main() {
    let mut prompt = readline::Prompt::new();

    while let Some(line) = prompt.readline("user> ") {
        let result = rep(&line);
        println!("{}", result);
    }
}
