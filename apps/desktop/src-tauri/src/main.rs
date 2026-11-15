mod assistant;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            assistant::assistant_has_key,
            assistant::assistant_save_key,
            assistant::assistant_remove_key,
            assistant::assistant_complete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
