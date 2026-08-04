use serde::{Deserialize, Serialize};

mod radio_rules;

use radio_rules::{RuleContext, RuleError, RuleEvaluation};

#[derive(Serialize, Deserialize, Debug)]
pub struct ParsedBlock {
    pub block_type: String,
    pub content: String,
    pub metadata: Option<String>,
}

#[tauri::command]
fn parse_custom_language(code: &str) -> Vec<ParsedBlock> {
    let mut blocks = Vec::new();
    let mut pending_text = Vec::new();

    let flush_text = |pending: &mut Vec<String>, blocks: &mut Vec<ParsedBlock>| {
        if !pending.is_empty() {
            blocks.push(ParsedBlock {
                block_type: "text".to_string(),
                content: pending.join("\n"),
                metadata: None,
            });
            pending.clear();
        }
    };

    for line in code.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("#graph[") && trimmed.ends_with(']') {
            flush_text(&mut pending_text, &mut blocks);
            let inner = &trimmed[7..trimmed.len() - 1];
            blocks.push(ParsedBlock {
                block_type: "mermaid".to_string(),
                content: format!("graph TD\n    {}", inner.replace("->", "-->")),
                metadata: None,
            });
        } else if trimmed.starts_with("#adif{") && trimmed.ends_with('}') {
            flush_text(&mut pending_text, &mut blocks);
            let inner = &trimmed[6..trimmed.len() - 1];
            blocks.push(ParsedBlock {
                block_type: "adif".to_string(),
                content: inner.to_string(),
                metadata: Some("QSO Record".to_string()),
            });
        } else {
            pending_text.push(line.to_string());
        }
    }

    flush_text(&mut pending_text, &mut blocks);
    blocks
}

/// Runs only the whitelisted, capability-free Radio Rules language.
/// Виконує лише дозволену мову Radio Rules без системних можливостей.
/// Führt nur die freigegebene Radio-Rules-Sprache ohne Systemzugriff aus.
#[tauri::command]
fn evaluate_radio_rules(source: &str, context: RuleContext) -> Result<RuleEvaluation, RuleError> {
    radio_rules::evaluate(source, &context)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init()) // <- Додано плагін діалогів
        .plugin(tauri_plugin_fs::init()) // <- Додано плагін файлової системи
        .invoke_handler(tauri::generate_handler![
            parse_custom_language,
            evaluate_radio_rules
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
