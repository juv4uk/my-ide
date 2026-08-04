//! Safe Lisp-like rules for QSO automation.
//! Безпечні Lisp-подібні правила для автоматизації QSO.
//! Sichere Lisp-ähnliche Regeln für die QSO-Automatisierung.
//!
//! This module has no file, network, process, or Tauri capabilities. A rule can only
//! inspect the supplied QSO snapshot and suggest a `tag` or `note`.

use serde::{Deserialize, Serialize};

const MAX_SOURCE_BYTES: usize = 32 * 1024;
const MAX_TOKENS: usize = 4_096;
const MAX_DEPTH: usize = 32;
const MAX_RULES: usize = 128;
const MAX_ACTIONS: usize = 256;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleContext {
    pub call: String,
    pub band: String,
    pub mode: String,
    pub tx_power_mw: f64,
    pub rst_sent: String,
    pub rst_received: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RuleEvaluation {
    pub matched_rules: Vec<String>,
    pub tags: Vec<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RuleError {
    pub kind: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct Location {
    line: usize,
    column: usize,
}

impl RuleError {
    fn new(kind: &str, message: impl Into<String>, at: Location) -> Self {
        Self {
            kind: kind.into(),
            message: message.into(),
            line: at.line,
            column: at.column,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
enum TokenKind {
    Left,
    Right,
    String(String),
    Number(f64),
    Symbol(String),
}

#[derive(Debug, Clone, PartialEq)]
struct Token {
    kind: TokenKind,
    at: Location,
}

#[derive(Debug, Clone, PartialEq)]
enum ExprKind {
    List(Vec<Expr>),
    String(String),
    Number(f64),
    Symbol(String),
}

#[derive(Debug, Clone, PartialEq)]
struct Expr {
    kind: ExprKind,
    at: Location,
}

/// Evaluates a complete rules document against one immutable QSO snapshot.
/// Виконує документ правил для одного незмінного знімка QSO.
/// Bewertet ein Regeldokument gegen einen unveränderlichen QSO-Schnappschuss.
pub fn evaluate(source: &str, context: &RuleContext) -> Result<RuleEvaluation, RuleError> {
    if source.len() > MAX_SOURCE_BYTES {
        return Err(error(
            "limit",
            format!("Source exceeds {MAX_SOURCE_BYTES} bytes"),
        ));
    }
    let tokens = tokenize(source)?;
    let expressions = parse(&tokens)?;
    if expressions.len() > MAX_RULES {
        return Err(RuleError::new(
            "limit",
            format!("At most {MAX_RULES} rules are allowed"),
            expressions[MAX_RULES].at,
        ));
    }
    let mut output = RuleEvaluation {
        matched_rules: vec![],
        tags: vec![],
        notes: vec![],
    };
    for expression in &expressions {
        evaluate_rule(expression, context, &mut output)?;
    }
    Ok(output)
}

fn tokenize(source: &str) -> Result<Vec<Token>, RuleError> {
    let chars: Vec<char> = source.chars().collect();
    let (mut i, mut line, mut column) = (0, 1, 1);
    let mut tokens = Vec::new();
    while i < chars.len() {
        let ch = chars[i];
        let at = Location { line, column };
        match ch {
            '(' | ')' => {
                tokens.push(Token {
                    kind: if ch == '(' {
                        TokenKind::Left
                    } else {
                        TokenKind::Right
                    },
                    at,
                });
                advance(ch, &mut i, &mut line, &mut column);
            }
            ';' => {
                while i < chars.len() && chars[i] != '\n' {
                    advance(chars[i], &mut i, &mut line, &mut column);
                }
            }
            '"' => {
                advance(ch, &mut i, &mut line, &mut column);
                let mut text = String::new();
                let mut closed = false;
                while i < chars.len() {
                    let current = chars[i];
                    if current == '"' {
                        advance(current, &mut i, &mut line, &mut column);
                        closed = true;
                        break;
                    }
                    if current == '\\' {
                        advance(current, &mut i, &mut line, &mut column);
                        let escaped = chars.get(i).copied().ok_or_else(|| {
                            RuleError::new("syntax", "Unfinished escape sequence", at)
                        })?;
                        text.push(match escaped {
                            'n' => '\n',
                            'r' => '\r',
                            't' => '\t',
                            '"' => '"',
                            '\\' => '\\',
                            _ => {
                                return Err(RuleError::new(
                                    "syntax",
                                    format!("Unsupported escape: \\{escaped}"),
                                    Location { line, column },
                                ))
                            }
                        });
                        advance(escaped, &mut i, &mut line, &mut column);
                    } else {
                        text.push(current);
                        advance(current, &mut i, &mut line, &mut column);
                    }
                }
                if !closed {
                    return Err(RuleError::new("syntax", "Unterminated string", at));
                }
                tokens.push(Token {
                    kind: TokenKind::String(text),
                    at,
                });
            }
            value if value.is_whitespace() => advance(value, &mut i, &mut line, &mut column),
            _ => {
                let mut atom = String::new();
                while i < chars.len()
                    && !chars[i].is_whitespace()
                    && !matches!(chars[i], '(' | ')' | ';')
                {
                    atom.push(chars[i]);
                    advance(chars[i], &mut i, &mut line, &mut column);
                }
                let kind = atom
                    .parse::<f64>()
                    .map(TokenKind::Number)
                    .unwrap_or(TokenKind::Symbol(atom));
                tokens.push(Token { kind, at });
            }
        }
        if tokens.len() > MAX_TOKENS {
            return Err(RuleError::new(
                "limit",
                format!("At most {MAX_TOKENS} tokens are allowed"),
                at,
            ));
        }
    }
    Ok(tokens)
}

fn advance(ch: char, i: &mut usize, line: &mut usize, column: &mut usize) {
    *i += 1;
    if ch == '\n' {
        *line += 1;
        *column = 1;
    } else {
        *column += 1;
    }
}

fn parse(tokens: &[Token]) -> Result<Vec<Expr>, RuleError> {
    let mut i = 0;
    let mut expressions = vec![];
    while i < tokens.len() {
        expressions.push(parse_expr(tokens, &mut i, 0)?);
    }
    Ok(expressions)
}

fn parse_expr(tokens: &[Token], i: &mut usize, depth: usize) -> Result<Expr, RuleError> {
    let token = tokens
        .get(*i)
        .ok_or_else(|| error("syntax", "Unexpected end of input"))?;
    *i += 1;
    match &token.kind {
        TokenKind::Left => {
            if depth >= MAX_DEPTH {
                return Err(RuleError::new(
                    "limit",
                    format!("Maximum nesting is {MAX_DEPTH}"),
                    token.at,
                ));
            }
            let mut values = vec![];
            while !matches!(tokens.get(*i).map(|t| &t.kind), Some(TokenKind::Right)) {
                if *i >= tokens.len() {
                    return Err(RuleError::new(
                        "syntax",
                        "Missing closing parenthesis",
                        token.at,
                    ));
                }
                values.push(parse_expr(tokens, i, depth + 1)?);
            }
            *i += 1;
            Ok(Expr {
                kind: ExprKind::List(values),
                at: token.at,
            })
        }
        TokenKind::Right => Err(RuleError::new(
            "syntax",
            "Unexpected closing parenthesis",
            token.at,
        )),
        TokenKind::String(v) => Ok(Expr {
            kind: ExprKind::String(v.clone()),
            at: token.at,
        }),
        TokenKind::Number(v) => Ok(Expr {
            kind: ExprKind::Number(*v),
            at: token.at,
        }),
        TokenKind::Symbol(v) => Ok(Expr {
            kind: ExprKind::Symbol(v.clone()),
            at: token.at,
        }),
    }
}

fn evaluate_rule(
    expr: &Expr,
    context: &RuleContext,
    output: &mut RuleEvaluation,
) -> Result<(), RuleError> {
    let rule = list(expr)?;
    exact(rule, 3, "rule", expr.at)?;
    named(&rule[0], "rule")?;
    let name = string(&rule[1], "Rule name must be a string")?;
    let when = list(&rule[2])?;
    if when.len() < 3 {
        return Err(RuleError::new(
            "validation",
            "when needs a condition and an action",
            rule[2].at,
        ));
    }
    named(&when[0], "when")?;
    if when.len() - 2 > MAX_ACTIONS {
        return Err(RuleError::new(
            "limit",
            format!("At most {MAX_ACTIONS} actions are allowed"),
            rule[2].at,
        ));
    }

    let matched = boolean(&when[1], context)?;
    // Validate actions even when the condition is false, so typos cannot remain hidden.
    for action in &when[2..] {
        let (name, text) = action_parts(action)?;
        if matched {
            let target = if name == "tag" {
                &mut output.tags
            } else {
                &mut output.notes
            };
            if !target.iter().any(|item| item == text) {
                target.push(text.to_string());
            }
        }
    }
    if matched {
        output.matched_rules.push(name.to_string());
    }
    Ok(())
}

fn boolean(expr: &Expr, context: &RuleContext) -> Result<bool, RuleError> {
    let values = list(expr)?;
    let operator = symbol(
        values
            .first()
            .ok_or_else(|| RuleError::new("validation", "Empty condition", expr.at))?,
    )?;
    match operator {
        "and" | "or" => {
            minimum(values, 3, operator, expr.at)?;
            let mut result = operator == "and";
            for item in &values[1..] {
                let current = boolean(item, context)?;
                result = if operator == "and" {
                    result && current
                } else {
                    result || current
                };
            }
            Ok(result)
        }
        "not" => {
            exact(values, 2, operator, expr.at)?;
            Ok(!boolean(&values[1], context)?)
        }
        "=" | "!=" => {
            exact(values, 3, operator, expr.at)?;
            let equal = match (value(&values[1], context)?, value(&values[2], context)?) {
                (Value::Text(a), Value::Text(b)) => a.eq_ignore_ascii_case(&b),
                (Value::Number(a), Value::Number(b)) => (a - b).abs() < f64::EPSILON,
                _ => {
                    return Err(RuleError::new(
                        "type",
                        "Compared values must have the same type",
                        expr.at,
                    ))
                }
            };
            Ok(if operator == "=" { equal } else { !equal })
        }
        "<" | "<=" | ">" | ">=" => {
            exact(values, 3, operator, expr.at)?;
            let (a, b) = (number(&values[1], context)?, number(&values[2], context)?);
            Ok(match operator {
                "<" => a < b,
                "<=" => a <= b,
                ">" => a > b,
                _ => a >= b,
            })
        }
        _ => Err(RuleError::new(
            "validation",
            format!("Unknown condition: {operator}"),
            values[0].at,
        )),
    }
}

enum Value {
    Text(String),
    Number(f64),
}

fn value(expr: &Expr, context: &RuleContext) -> Result<Value, RuleError> {
    match &expr.kind {
        ExprKind::String(v) => Ok(Value::Text(v.clone())),
        ExprKind::Number(v) if v.is_finite() => Ok(Value::Number(*v)),
        ExprKind::Number(_) => Err(RuleError::new("type", "Numbers must be finite", expr.at)),
        ExprKind::Symbol(field) => match field.as_str() {
            "call" => Ok(Value::Text(context.call.clone())),
            "band" => Ok(Value::Text(context.band.clone())),
            "mode" => Ok(Value::Text(context.mode.clone())),
            "rst-sent" => Ok(Value::Text(context.rst_sent.clone())),
            "rst-received" => Ok(Value::Text(context.rst_received.clone())),
            "tx-power-mw" => Ok(Value::Number(context.tx_power_mw)),
            _ => Err(RuleError::new(
                "validation",
                format!("Unknown QSO field: {field}"),
                expr.at,
            )),
        },
        ExprKind::List(_) => Err(RuleError::new(
            "type",
            "Comparison values cannot be lists",
            expr.at,
        )),
    }
}

fn number(expr: &Expr, context: &RuleContext) -> Result<f64, RuleError> {
    match value(expr, context)? {
        Value::Number(v) => Ok(v),
        Value::Text(_) => Err(RuleError::new(
            "type",
            "Numeric comparison requires numbers",
            expr.at,
        )),
    }
}

fn action_parts(expr: &Expr) -> Result<(&str, &str), RuleError> {
    let values = list(expr)?;
    exact(values, 2, "action", expr.at)?;
    let name = symbol(&values[0])?;
    if !matches!(name, "tag" | "note") {
        return Err(RuleError::new(
            "validation",
            format!("Unknown action: {name}"),
            values[0].at,
        ));
    }
    let text = string(&values[1], "Action value must be a string")?;
    if text.trim().is_empty() || text.chars().count() > 500 {
        return Err(RuleError::new(
            "validation",
            "Action text must contain 1 to 500 characters",
            values[1].at,
        ));
    }
    Ok((name, text))
}

fn list(expr: &Expr) -> Result<&[Expr], RuleError> {
    match &expr.kind {
        ExprKind::List(v) => Ok(v),
        _ => Err(RuleError::new("type", "Expected a list", expr.at)),
    }
}
fn symbol(expr: &Expr) -> Result<&str, RuleError> {
    match &expr.kind {
        ExprKind::Symbol(v) => Ok(v),
        _ => Err(RuleError::new("type", "Expected a symbol", expr.at)),
    }
}
fn string<'a>(expr: &'a Expr, message: &str) -> Result<&'a str, RuleError> {
    match &expr.kind {
        ExprKind::String(v) => Ok(v),
        _ => Err(RuleError::new("type", message, expr.at)),
    }
}
fn named(expr: &Expr, expected: &str) -> Result<(), RuleError> {
    let actual = symbol(expr)?;
    if actual == expected {
        Ok(())
    } else {
        Err(RuleError::new(
            "validation",
            format!("Expected {expected}, found {actual}"),
            expr.at,
        ))
    }
}
fn exact(values: &[Expr], count: usize, name: &str, at: Location) -> Result<(), RuleError> {
    if values.len() == count {
        Ok(())
    } else {
        Err(RuleError::new(
            "validation",
            format!("{name} expects {} arguments", count - 1),
            at,
        ))
    }
}
fn minimum(values: &[Expr], count: usize, name: &str, at: Location) -> Result<(), RuleError> {
    if values.len() >= count {
        Ok(())
    } else {
        Err(RuleError::new(
            "validation",
            format!("{name} expects at least {} arguments", count - 1),
            at,
        ))
    }
}
fn error(kind: &str, message: impl Into<String>) -> RuleError {
    RuleError::new(kind, message, Location { line: 1, column: 1 })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn qso(power: f64) -> RuleContext {
        RuleContext {
            call: "DL1ABC".into(),
            band: "20M".into(),
            mode: "CW".into(),
            tx_power_mw: power,
            rst_sent: "599".into(),
            rst_received: "579".into(),
        }
    }

    #[test]
    fn evaluates_qrpp_rule() {
        let source = r#"; comment
          (rule "QRPp contact"
            (when (and (= band "20m") (< tx-power-mw 1000))
              (tag "QRPp") (note "Low-power contact")))"#;
        let result = evaluate(source, &qso(100.0)).unwrap();
        assert_eq!(result.matched_rules, vec!["QRPp contact"]);
        assert_eq!(result.tags, vec!["QRPp"]);
        assert_eq!(result.notes, vec!["Low-power contact"]);
    }

    #[test]
    fn non_matching_rule_has_no_effect() {
        let result = evaluate(
            r#"(rule "QRO" (when (> tx-power-mw 5000) (tag "QRO")))"#,
            &qso(100.0),
        )
        .unwrap();
        assert!(result.matched_rules.is_empty());
    }

    #[test]
    fn rejects_unknown_capabilities() {
        let field = evaluate(
            r#"(rule "x" (when (= password "x") (tag "x")))"#,
            &qso(100.0),
        )
        .unwrap_err();
        assert!(field.message.contains("Unknown QSO field"));
        let action = evaluate(
            r#"(rule "x" (when (= band "20M") (open-file "x")))"#,
            &qso(100.0),
        )
        .unwrap_err();
        assert!(action.message.contains("Unknown action"));
    }

    #[test]
    fn reports_syntax_location() {
        let result = evaluate(
            "\n(rule \"broken\" (when (= band \"20M\") (tag \"x\"))",
            &qso(100.0),
        )
        .unwrap_err();
        assert_eq!((result.line, result.column), (2, 1));
    }

    #[test]
    fn deduplicates_actions() {
        let source = r#"(rule "one" (when (< tx-power-mw 1000) (tag "QRPp")))
                         (rule "two" (when (= mode "CW") (tag "QRPp")))"#;
        let result = evaluate(source, &qso(50.0)).unwrap();
        assert_eq!(result.tags, vec!["QRPp"]);
        assert_eq!(result.matched_rules.len(), 2);
    }
}
