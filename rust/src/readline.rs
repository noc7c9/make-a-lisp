use rustyline::error::ReadlineError;
use rustyline::Editor;

const HISTORY_FILE: &str = "repl.history";

pub struct Prompt {
    editor: Editor<()>,
}

impl Prompt {
    pub fn new() -> Self {
        let mut editor = Editor::<()>::new();

        let _ = editor.load_history(HISTORY_FILE);

        Self { editor }
    }

    pub fn readline<'a>(&'a mut self, prompt: &str) -> Option<String> {
        match self.editor.readline(prompt) {
            Ok(line) => {
                self.editor.add_history_entry(line.as_str());
                let _ = self.editor.save_history(HISTORY_FILE);
                Some(line)
            }
            Err(ReadlineError::Interrupted) | Err(ReadlineError::Eof) => None,
            Err(err) => {
                eprintln!("Unexpected Readline Error: {:?}", err);
                None
            }
        }
    }
}

impl Default for Prompt {
    fn default() -> Self {
        Self::new()
    }
}
