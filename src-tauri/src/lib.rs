use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub title: String,
    pub author: String,
    pub created: String,
    pub root_path: String,
    #[serde(default)]
    pub chapters: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct OutlineItem {
    pub id: String,
    pub chapter_id: String,
    pub text: String,
    pub anchor_id: String,
    #[serde(rename = "type")]
    pub item_type: OutlineItemType,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Theme {
    pub name: String,
    pub font_family: String,
    pub font_size: f32,
    pub line_height: f32,
    pub background_color: String,
    pub text_color: String,
    pub accent_color: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub is_dir: bool,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn create_project(title: String, author: String, path: String) -> Result<Project, String> {
    let root = Path::new(&path).join(&title);

    // Create directory tree
    fs::create_dir_all(root.join("chapters")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("codex/characters")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("codex/places")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("codex/items")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("themes")).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let project = Project {
        id: Uuid::new_v4().to_string(),
        title: title.clone(),
        author,
        created: now,
        root_path: root.to_string_lossy().to_string(),
        chapters: vec![],
    };

    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(root.join("project.json"), json).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
fn open_project(path: String) -> Result<Project, String> {
    let json_path = Path::new(&path).join("project.json");
    let content = fs::read_to_string(&json_path).map_err(|e| e.to_string())?;
    let mut project: Project = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    // Ensure root_path reflects where the project actually lives on disk
    project.root_path = path;
    Ok(project)
}

// --- Helpers ---

fn title_to_slug(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn slug_to_title(filename: &str) -> String {
    let stem = filename.trim_end_matches(".md").replace('-', " ");
    let mut chars = stem.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}

fn read_project_json(project_path: &str) -> Result<Project, String> {
    let json_path = Path::new(project_path).join("project.json");
    let content = fs::read_to_string(&json_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_project_json(project_path: &str, project: &Project) -> Result<(), String> {
    let json_path = Path::new(project_path).join("project.json");
    let tmp = json_path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(project).map_err(|e| e.to_string())?;
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &json_path).map_err(|e| e.to_string())
}

// --- Chapter CRUD commands ---

#[tauri::command]
fn list_chapters(project_path: String) -> Result<Vec<Chapter>, String> {
    let project = read_project_json(&project_path)?;
    let chapters_dir = Path::new(&project_path).join("chapters");
    let chapters = project
        .chapters
        .iter()
        .enumerate()
        .filter_map(|(idx, filename)| {
            if !chapters_dir.join(filename).exists() {
                return None; // graceful degradation for missing files
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
fn read_chapter(project_path: String, filename: String) -> Result<String, String> {
    let path = Path::new(&project_path).join("chapters").join(&filename);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_chapter(project_path: String, filename: String, content: String) -> Result<(), String> {
    let dir = Path::new(&project_path).join("chapters");
    let tmp = dir.join(format!("{}.tmp", filename));
    let dest = dir.join(&filename);
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_chapter(project_path: String, title: String) -> Result<Chapter, String> {
    let mut project = read_project_json(&project_path)?;
    let chapters_dir = Path::new(&project_path).join("chapters");
    let base_slug = title_to_slug(&title);
    // Deduplicate: if slug.md already exists, try slug-2.md, slug-3.md, etc.
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
fn rename_chapter(
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
        let old_notes =
            chapters_dir.join(format!("{}.notes.json", filename.trim_end_matches(".md")));
        if old_notes.exists() {
            let new_notes = chapters_dir
                .join(format!("{}.notes.json", new_filename.trim_end_matches(".md")));
            fs::rename(old_notes, new_notes).map_err(|e| e.to_string())?;
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
fn delete_chapter(project_path: String, filename: String) -> Result<(), String> {
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
    let notes =
        chapters_dir.join(format!("{}.notes.json", filename.trim_end_matches(".md")));
    if notes.exists() {
        fs::remove_file(notes).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn reorder_chapters(project_path: String, filenames: Vec<String>) -> Result<(), String> {
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

// --- Outline/notes CRUD commands ---

#[tauri::command]
fn read_outline(
    project_path: String,
    chapter_filename: String,
) -> Result<Vec<OutlineItem>, String> {
    let stem = chapter_filename.trim_end_matches(".md");
    let path = Path::new(&project_path)
        .join("chapters")
        .join(format!("{}.notes.json", stem));
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_outline(
    project_path: String,
    chapter_filename: String,
    items: Vec<OutlineItem>,
) -> Result<(), String> {
    let stem = chapter_filename.trim_end_matches(".md");
    let dir = Path::new(&project_path).join("chapters");
    let dest = dir.join(format!("{}.notes.json", stem));
    let tmp = dir.join(format!("{}.notes.json.tmp", stem));
    let json = serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?;
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())
}

// --- Raw file commands ---

fn collect_file_entries(root: &Path, dir: &Path, entries: &mut Vec<FileEntry>) -> Result<(), String> {
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
fn list_project_files(project_path: String) -> Result<Vec<FileEntry>, String> {
    let root = Path::new(&project_path);
    let mut entries = Vec::new();
    collect_file_entries(root, root, &mut entries)?;
    Ok(entries)
}

#[tauri::command]
fn read_raw_file(project_path: String, relative_path: String) -> Result<String, String> {
    let path = Path::new(&project_path).join(&relative_path);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_raw_file(project_path: String, relative_path: String, content: String) -> Result<(), String> {
    let path = Path::new(&project_path).join(&relative_path);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    let tmp = path.with_file_name(format!(".{}.tmp", file_name));
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

// --- Codex CRUD commands ---

#[tauri::command]
fn list_codex(project_path: String) -> Result<Vec<CodexEntry>, String> {
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
fn read_codex_entry(
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
fn save_codex_entry(
    project_path: String,
    category: String,
    filename: String,
    content: String,
) -> Result<(), String> {
    let dir = Path::new(&project_path).join("codex").join(&category);
    let tmp = dir.join(format!("{}.tmp", filename));
    let dest = dir.join(&filename);
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_codex_entry(
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
fn delete_codex_entry(
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_project,
            open_project,
            list_chapters,
            read_chapter,
            save_chapter,
            create_chapter,
            rename_chapter,
            delete_chapter,
            reorder_chapters,
            read_outline,
            save_outline,
            list_project_files,
            read_raw_file,
            save_raw_file,
            list_codex,
            read_codex_entry,
            save_codex_entry,
            create_codex_entry,
            delete_codex_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
