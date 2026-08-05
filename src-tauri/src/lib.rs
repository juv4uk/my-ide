mod radio_rules;

use radio_rules::{RuleContext, RuleError, RuleEvaluation};

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
        .invoke_handler(tauri::generate_handler![evaluate_radio_rules])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
