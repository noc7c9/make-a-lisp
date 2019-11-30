use crate::error::Error;
use std::collections::HashMap as StdHashMap;
use std::convert::TryFrom;
use std::string::String as StdString;

#[derive(Debug)]
pub enum AST {
    Nil(Nil),
    Keyword(Keyword),
    Symbol(Symbol),
    String(String),
    Boolean(Boolean),
    Number(Number),
    List(List),
    Vector(Vector),
    HashMap(HashMap),
}

impl AST {
    pub fn nil() -> Self {
        AST::Nil(Nil)
    }
    pub fn keyword(value: impl Into<StdString>) -> Self {
        AST::Keyword(Keyword(value.into()))
    }
    pub fn symbol(value: impl Into<StdString>) -> Self {
        AST::Symbol(Symbol(value.into()))
    }
    pub fn string(value: impl Into<StdString>) -> Self {
        AST::String(String(value.into()))
    }
    pub fn boolean(value: bool) -> Self {
        AST::Boolean(Boolean(value))
    }
    pub fn number(value: f64) -> Self {
        AST::Number(Number(value))
    }
    pub fn list(value: Vec<AST>) -> Self {
        AST::List(List(value))
    }
    pub fn vector(value: Vec<AST>) -> Self {
        AST::Vector(Vector(value))
    }
    pub fn hashmap(value: StdHashMap<HashMapKey, AST>) -> Self {
        AST::HashMap(HashMap(value))
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct Nil;

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Keyword(pub StdString);

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Symbol(pub StdString);

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct String(pub StdString);

#[derive(Debug, PartialEq, Eq)]
pub struct Boolean(pub bool);

#[derive(Debug, PartialEq)]
pub struct Number(pub f64);

#[derive(Debug)]
pub struct List(pub Vec<AST>);

#[derive(Debug)]
pub struct Vector(pub Vec<AST>);

#[derive(Debug)]
pub struct HashMap(pub StdHashMap<HashMapKey, AST>);

#[derive(Debug, PartialEq, Eq, Hash)]
pub enum HashMapKey {
    Keyword(Keyword),
    String(String),
}

impl TryFrom<AST> for HashMapKey {
    type Error = Error;

    fn try_from(ast: AST) -> Result<Self, Self::Error> {
        match ast {
            AST::Keyword(inner) => Ok(HashMapKey::Keyword(inner)),
            AST::String(inner) => Ok(HashMapKey::String(inner)),
            _ => Err(Error::UnsupportedHashMapKeyType),
        }
    }
}

impl From<HashMapKey> for AST {
    fn from(hashable: HashMapKey) -> Self {
        match hashable {
            HashMapKey::Keyword(inner) => AST::Keyword(inner),
            HashMapKey::String(inner) => AST::String(inner),
        }
    }
}

pub enum Container {
    List,
    Vector,
    HashMap,
}
