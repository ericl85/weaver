use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::util::atomic_write;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub is_dir: bool,
}

pub(crate) fn collect_file_entries(root: &Path, dir: &Path, entries: &mut Vec<FileEntry>) -> Result<(), String> {
    let mut items: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();
    items.sort_by(|a, b| {
        let a_is_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_is_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        b_is_dir.cmp(&a_is_dir).then(a.file_name().cmp(&b.file_name()))
    });
    for entry in items {
        let path = entry.path();
        let rel = path.strip_prefix(root).map_err(|e| e.to_string())?;
        let rel_str = rel.to_string_lossy().replace('\\', "/");
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        entries.push(FileEntry { path: rel_str, is_dir });
        if is_dir {
            collect_file_entries(root, &path, entries)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_project_files(project_path: String) -> Result<Vec<FileEntry>, String> {
    let root = Path::new(&project_path);
    let mut entries = Vec::new();
    collect_file_entries(root, root, &mut entries)?;
    Ok(entries)
}

#[tauri::command]
pub fn read_raw_file(project_path: String, relative_path: String) -> Result<String, String> {
    let path = Path::new(&project_path).join(&relative_path);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_raw_file(project_path: String, relative_path: String, content: String) -> Result<(), String> {
    let path = Path::new(&project_path).join(&relative_path);
    atomic_write(&path, content)
}
