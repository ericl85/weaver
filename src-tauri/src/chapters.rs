use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::project::{read_project_json, write_project_json};
use crate::stickies::stickies_path;
use crate::util::{atomic_write, slug_to_title, title_to_slug};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub order: u32,
    pub word_count: Option<u32>,
}

#[tauri::command]
pub fn list_chapters(project_path: String) -> Result<Vec<Chapter>, String> {
    let project = read_project_json(&project_path)?;
    let chapters_dir = Path::new(&project_path).join("chapters");
    let chapters = project
        .chapters
        .iter()
        .enumerate()
        .filter_map(|(idx, filename)| {
            if !chapters_dir.join(filename).exists() {
                return None;
            }
            Some(Chapter {
                id: filename.clone(),
                title: slug_to_title(filename),
                filename: filename.clone(),
                order: idx as u32,
                word_count: None,
            })
        })
        .collect();
    Ok(chapters)
}

#[tauri::command]
pub fn read_chapter(project_path: String, filename: String) -> Result<String, String> {
    let path = Path::new(&project_path).join("chapters").join(&filename);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_chapter(project_path: String, filename: String, content: String) -> Result<(), String> {
    let path = Path::new(&project_path).join("chapters").join(&filename);
    atomic_write(&path, content)
}

#[tauri::command]
pub fn create_chapter(project_path: String, title: String) -> Result<Chapter, String> {
    let mut project = read_project_json(&project_path)?;
    let chapters_dir = Path::new(&project_path).join("chapters");
    let base_slug = title_to_slug(&title);
    let mut filename = format!("{}.md", base_slug);
    let mut counter = 2u32;
    while chapters_dir.join(&filename).exists() {
        filename = format!("{}-{}.md", base_slug, counter);
        counter += 1;
    }
    fs::write(chapters_dir.join(&filename), "").map_err(|e| e.to_string())?;
    let order = project.chapters.len() as u32;
    project.chapters.push(filename.clone());
    write_project_json(&project_path, &project)?;
    Ok(Chapter {
        id: filename.clone(),
        title,
        filename,
        order,
        word_count: Some(0),
    })
}

#[tauri::command]
pub fn rename_chapter(
    project_path: String,
    filename: String,
    new_title: String,
) -> Result<Chapter, String> {
    let mut project = read_project_json(&project_path)?;
    let chapters_dir = Path::new(&project_path).join("chapters");

    let idx = project
        .chapters
        .iter()
        .position(|f| f == &filename)
        .ok_or_else(|| format!("Chapter not found in manifest: {}", filename))?;

    let base_slug = title_to_slug(&new_title);
    let mut new_filename = format!("{}.md", base_slug);
    let mut counter = 2u32;
    while new_filename != filename && chapters_dir.join(&new_filename).exists() {
        new_filename = format!("{}-{}.md", base_slug, counter);
        counter += 1;
    }

    if new_filename != filename {
        fs::rename(
            chapters_dir.join(&filename),
            chapters_dir.join(&new_filename),
        )
        .map_err(|e| e.to_string())?;
        let old_stickies = stickies_path(&project_path, &filename);
        if old_stickies.exists() {
            let new_stickies = stickies_path(&project_path, &new_filename);
            fs::rename(old_stickies, new_stickies).map_err(|e| e.to_string())?;
        }
        project.chapters[idx] = new_filename.clone();
        write_project_json(&project_path, &project)?;
    }

    Ok(Chapter {
        id: new_filename.clone(),
        title: new_title,
        filename: new_filename,
        order: idx as u32,
        word_count: None,
    })
}

#[tauri::command]
pub fn delete_chapter(project_path: String, filename: String) -> Result<(), String> {
    let mut project = read_project_json(&project_path)?;
    let chapters_dir = Path::new(&project_path).join("chapters");

    let idx = project
        .chapters
        .iter()
        .position(|f| f == &filename)
        .ok_or_else(|| format!("Chapter not found in manifest: {}", filename))?;
    project.chapters.remove(idx);
    write_project_json(&project_path, &project)?;

    fs::remove_file(chapters_dir.join(&filename)).map_err(|e| e.to_string())?;
    let stickies_file = stickies_path(&project_path, &filename);
    if stickies_file.exists() {
        fs::remove_file(stickies_file).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn reorder_chapters(project_path: String, filenames: Vec<String>) -> Result<(), String> {
    let mut project = read_project_json(&project_path)?;
    let mut current = project.chapters.clone();
    current.sort();
    let mut proposed = filenames.clone();
    proposed.sort();
    if current != proposed {
        return Err(
            "reorder_chapters: filenames must be the same set as the current manifest".to_string(),
        );
    }
    project.chapters = filenames;
    write_project_json(&project_path, &project)
}
