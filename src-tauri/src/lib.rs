use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub author: String,
    pub created: String,
    pub root_path: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub order: u32,
    pub word_count: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CodexEntry {
    pub id: String,
    pub title: String,
    pub category: String,
    pub filename: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OutlineItemType {
    Note,
    Todo,
    Feedback,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OutlineItem {
    pub id: String,
    pub chapter_id: String,
    pub text: String,
    pub anchor_offset: u32,
    pub anchor_length: u32,
    #[serde(rename = "type")]
    pub item_type: OutlineItemType,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Theme {
    pub name: String,
    pub font_family: String,
    pub font_size: f32,
    pub line_height: f32,
    pub background_color: String,
    pub text_color: String,
    pub accent_color: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
