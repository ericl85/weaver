use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::util::{atomic_write, title_to_slug};

#[derive(Serialize, Deserialize, Debug)]
pub struct CodexEntry {
    pub id: String,
    pub title: String,
    pub category: String,
    pub filename: String,
}

#[tauri::command]
pub fn list_codex(project_path: String) -> Result<Vec<CodexEntry>, String> {
    let codex_dir = Path::new(&project_path).join("codex");
    let mut entries = Vec::new();

    for category_entry in fs::read_dir(&codex_dir).map_err(|e| e.to_string())?.flatten() {
        if !category_entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }
        let category = category_entry.file_name().to_string_lossy().to_string();
        for file_entry in fs::read_dir(category_entry.path())
            .map_err(|e| e.to_string())?
            .flatten()
        {
            let name = file_entry.file_name().to_string_lossy().to_string();
            if !name.ends_with(".md") {
                continue;
            }
            let stem = name.trim_end_matches(".md");
            let title = stem.replace('-', " ");
            let title = {
                let mut chars = title.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                }
            };
            entries.push(CodexEntry {
                id: format!("{}/{}", category, name),
                title,
                category: category.clone(),
                filename: name,
            });
        }
    }

    entries.sort_by(|a, b| a.category.cmp(&b.category).then(a.title.cmp(&b.title)));
    Ok(entries)
}

#[tauri::command]
pub fn read_codex_entry(
    project_path: String,
    category: String,
    filename: String,
) -> Result<String, String> {
    let path = Path::new(&project_path)
        .join("codex")
        .join(&category)
        .join(&filename);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_codex_entry(
    project_path: String,
    category: String,
    filename: String,
    content: String,
) -> Result<(), String> {
    let path = Path::new(&project_path)
        .join("codex")
        .join(&category)
        .join(&filename);
    atomic_write(&path, content)
}

#[tauri::command]
pub fn create_codex_entry(
    project_path: String,
    category: String,
    title: String,
) -> Result<CodexEntry, String> {
    let dir = Path::new(&project_path).join("codex").join(&category);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let slug = title_to_slug(&title);
    let filename = format!("{}.md", slug);
    fs::write(dir.join(&filename), "").map_err(|e| e.to_string())?;
    Ok(CodexEntry {
        id: format!("{}/{}", category, filename),
        title,
        category,
        filename,
    })
}

#[tauri::command]
pub fn delete_codex_entry(
    project_path: String,
    category: String,
    filename: String,
) -> Result<(), String> {
    let path = Path::new(&project_path)
        .join("codex")
        .join(&category)
        .join(&filename);
    fs::remove_file(path).map_err(|e| e.to_string())
}
