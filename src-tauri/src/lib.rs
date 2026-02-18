// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Emitter, Manager};
use std::env;
use std::path::Path;
use std::sync::Mutex;

struct LaunchState {
    file_path: Mutex<Option<String>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_launch_file(state: tauri::State<LaunchState>) -> Option<String> {
    let mut file_path = state.file_path.lock().unwrap();
    file_path.take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(LaunchState {
            file_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![greet, get_launch_file])
        .setup(|app| {
            // Check for file arguments passed via file association
            let args: Vec<String> = env::args().collect();
            
            // Skip the first arg (exe path) and look for markdown files
            for arg in args.iter().skip(1) {
                let path = Path::new(arg);
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_str().unwrap_or("").to_lowercase(); // Case insensitive
                    if ext_str == "md" || ext_str == "markdown" {
                        // Store it in state for the frontend to pick up
                        if let Some(state) = app.try_state::<LaunchState>() {
                            *state.file_path.lock().unwrap() = Some(arg.clone());
                        }
                        // Also emit the event for good measure (if frontend is already watching)
                        let _ = app.emit("file-open", arg.clone());
                        break; // Only open the first file for now
                    }
                }
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
