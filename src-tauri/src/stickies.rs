use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use crate::project::{read_project_json, write_project_json};
use crate::util::atomic_write;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StickyCategory {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Sticky {
    pub id: String,
    pub chapter_id: String,
    pub text: String,
    pub category_id: String,
    pub anchor_id: Option<String>,
    pub created_at: String,
}

pub(crate) fn stickies_path(project_path: &str, chapter_filename: &str) -> PathBuf {
    let stem = chapter_filename.trim_end_matches(".md");
    Path::new(project_path)
        .join("stickies")
        .join(format!("{}.stickies.json", stem))
}

#[tauri::command]
pub fn read_stickies(project_path: String, chapter_filename: String) -> Result<Vec<Sticky>, String> {
    let path = stickies_path(&project_path, &chapter_filename);
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_stickies(
    project_path: String,
    chapter_filename: String,
    stickies: Vec<Sticky>,
) -> Result<(), String> {
    let path = stickies_path(&project_path, &chapter_filename);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&stickies).map_err(|e| e.to_string())?;
    atomic_write(&path, json)
}

#[tauri::command]
pub fn delete_sticky(
    project_path: String,
    chapter_filename: String,
    sticky_id: String,
) -> Result<(), String> {
    let path = stickies_path(&project_path, &chapter_filename);
    let mut stickies: Vec<Sticky> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        vec![]
    };
    let before = stickies.len();
    stickies.retain(|s| s.id != sticky_id);
    if stickies.len() == before {
        return Err(format!("Sticky not found: {}", sticky_id));
    }
    let json = serde_json::to_string_pretty(&stickies).map_err(|e| e.to_string())?;
    atomic_write(&path, json)
}

#[tauri::command]
pub fn list_categories(project_path: String) -> Result<Vec<StickyCategory>, String> {
    let project = read_project_json(&project_path)?;
    Ok(project.sticky_categories)
}

#[tauri::command]
pub fn add_category(
    project_path: String,
    name: String,
    color: String,
) -> Result<StickyCategory, String> {
    let mut project = read_project_json(&project_path)?;
    let category = StickyCategory {
        id: Uuid::new_v4().to_string(),
        name,
        color,
    };
    project.sticky_categories.push(category.clone());
    write_project_json(&project_path, &project)?;
    Ok(category)
}

#[tauri::command]
pub fn update_category(
    project_path: String,
    category_id: String,
    name: String,
    color: String,
) -> Result<StickyCategory, String> {
    let mut project = read_project_json(&project_path)?;
    let cat = project
        .sticky_categories
        .iter_mut()
        .find(|c| c.id == category_id)
        .ok_or_else(|| format!("Category not found: {}", category_id))?;
    cat.name = name;
    cat.color = color;
    let updated = cat.clone();
    write_project_json(&project_path, &project)?;
    Ok(updated)
}

#[tauri::command]
pub fn delete_category(project_path: String, category_id: String) -> Result<(), String> {
    let mut project = read_project_json(&project_path)?;
    let before = project.sticky_categories.len();
    project.sticky_categories.retain(|c| c.id != category_id);
    if project.sticky_categories.len() == before {
        return Err(format!("Category not found: {}", category_id));
    }
    write_project_json(&project_path, &project)
}
