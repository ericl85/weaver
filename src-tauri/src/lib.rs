use tauri::Emitter;

mod chapters;
mod codex;
mod menu;
mod project;
mod raw_files;
mod stickies;
mod util;

use chapters::{create_chapter, delete_chapter, list_chapters, read_chapter, rename_chapter, reorder_chapters, save_chapter};
use codex::{create_codex_entry, delete_codex_entry, list_codex, read_codex_entry, save_codex_entry};
use project::{create_project, open_project, update_project_metadata};
use raw_files::{list_project_files, read_raw_file, save_raw_file};
use stickies::{add_category, delete_category, delete_sticky, list_categories, read_stickies, save_stickies, update_category};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            menu::install_macos_menu(app)?;

            #[cfg(not(target_os = "macos"))]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.set_decorations(false)?;
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref().to_string();
            let _ = app.emit("weaver://menu", id);
        })
        .invoke_handler(tauri::generate_handler![
            add_category,
            create_chapter,
            create_codex_entry,
            create_project,
            delete_category,
            delete_chapter,
            delete_codex_entry,
            delete_sticky,
            list_categories,
            list_chapters,
            list_codex,
            list_project_files,
            open_project,
            read_chapter,
            read_codex_entry,
            read_raw_file,
            read_stickies,
            rename_chapter,
            reorder_chapters,
            save_chapter,
            save_codex_entry,
            save_raw_file,
            save_stickies,
            update_category,
            update_project_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
