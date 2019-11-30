use crate::error::Error;
use std::collections::HashMap;
use std::convert::TryFrom;

#[derive(Debug, Hash, PartialEq, Eq)]
pub enum Hashable {
    Keyword(String),
    String(String),
}

pub enum Container {
    List,
    Vector,
    HashMap,
}

#[derive(Debug)]
pub enum AST {
    List(Vec<AST>),
    Vector(Vec<AST>),
    HashMap(HashMap<Hashable, AST>),
    Keyword(String),
    Symbol(String),
    String(String),
    Bool(bool),
    Number(f64),
    Nil,
}

impl TryFrom<AST> for Hashable {
    type Error = Error;

    fn try_from(ast: AST) -> Result<Self, Self::Error> {
        match ast {
            AST::Keyword(value) => Ok(Hashable::Keyword(value)),
            AST::String(value) => Ok(Hashable::String(value)),
            _ => Err(Error::UnsupportedHashMapKeyType),
        }
    }
}

impl From<Hashable> for AST {
    fn from(hashable: Hashable) -> Self {
        match hashable {
            Hashable::Keyword(value) => AST::Keyword(value),
            Hashable::String(value) => AST::String(value),
        }
    }
}
