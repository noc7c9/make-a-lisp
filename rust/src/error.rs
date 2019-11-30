#[derive(Debug)]
pub enum Error {
    EmptyInput,
    InvalidEscape,
    MissingAtom,
    MissingHashMapValue,
    UnbalancedCollection,
    UnbalancedString,
    UnsupportedHashMapKeyType,
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        write!(
            f,
            "Error: {}",
            match *self {
                Error::EmptyInput => "empty input",
                Error::InvalidEscape => "invalid escape",
                Error::MissingAtom => "missing atom",
                Error::MissingHashMapValue => "missing hash-map value",
                Error::UnbalancedCollection => "unbalanced collection",
                Error::UnbalancedString => "unbalanced string",
                Error::UnsupportedHashMapKeyType => "unsupported hash-map key type",
            }
        )
    }
}
