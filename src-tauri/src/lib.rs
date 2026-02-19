// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Emitter, Manager, RunEvent};
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

fn process_file_path(app_handle: &tauri::AppHandle, file_path: String) {
    let path = Path::new(&file_path);
    if let Some(ext) = path.extension() {
        let ext_str = ext.to_str().unwrap_or("").to_lowercase();
        if ext_str == "md" || ext_str == "markdown" {
            // Store in state for get_launch_file
            if let Some(state) = app_handle.try_state::<LaunchState>() {
                *state.file_path.lock().unwrap() = Some(file_path.clone());
            }
            // Emit event for frontend
            let _ = app_handle.emit("file-open", file_path);
        }
    }
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
            // Check for file arguments passed via command line (Windows/Linux)
            let args: Vec<String> = env::args().collect();
            
            // Skip the first arg (exe path) and look for markdown files
            for arg in args.iter().skip(1) {
                let path = Path::new(arg);
                if path.exists() && path.is_file() {
                    if let Some(ext) = path.extension() {
                        let ext_str = ext.to_str().unwrap_or("").to_lowercase();
                        if ext_str == "md" || ext_str == "markdown" {
                            process_file_path(&app.handle(), arg.clone());
                            break;
                        }
                    }
                }
            }
            
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Handle macOS file open events
            if let RunEvent::Opened { urls } = event {
                if let Some(url) = urls.first() {
                    // Convert URL to file path
                    if let Ok(file_path) = url.to_file_path() {
                        if let Some(path_str) = file_path.to_str() {
                            process_file_path(app_handle, path_str.to_string());
                        }
                    }
                }
            }
        });
}
