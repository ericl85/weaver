use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;
use crate::stickies::StickyCategory;
use crate::util::{atomic_write, weaver_dir};

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct WeaverConfig {
    pub active_theme: Option<String>,
}

#[allow(dead_code)]
pub(crate) fn read_weaver_config(project_path: &str) -> Result<WeaverConfig, String> {
    let path = weaver_dir(project_path).join("config.json");
    if !path.exists() {
        return Ok(WeaverConfig::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub(crate) fn write_weaver_config(project_path: &str, config: &WeaverConfig) -> Result<(), String> {
    let path = weaver_dir(project_path).join("config.json");
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    atomic_write(&path, json)
}

fn migrate_to_weaver_dir(project_path: &str) -> Result<(), String> {
    let root = Path::new(project_path);
    let weaver = weaver_dir(project_path);

    crate::util::ensure_weaver_dir(project_path)?;

    // Migrate legacy stats.json
    let legacy_stats = root.join("stats.json");
    let new_stats = weaver.join("stats.json");
    if legacy_stats.exists() && !new_stats.exists() {
        fs::rename(&legacy_stats, &new_stats)
            .or_else(|_| fs::copy(&legacy_stats, &new_stats).map(|_| ()))
            .map_err(|e| e.to_string())?;
    }

    // Migrate legacy stickies/ directory (move each file individually)
    let legacy_stickies = root.join("stickies");
    let new_stickies = weaver.join("stickies");
    if legacy_stickies.exists() && legacy_stickies.is_dir() {
        let new_has_files = fs::read_dir(&new_stickies)
            .map(|mut d| d.next().is_some())
            .unwrap_or(false);
        if !new_has_files {
            for entry in fs::read_dir(&legacy_stickies).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let src = entry.path();
                let dst = new_stickies.join(entry.file_name());
                fs::rename(&src, &dst)
                    .or_else(|_| fs::copy(&src, &dst).map(|_| ()))
                    .map_err(|e| e.to_string())?;
            }
        }
    }

    // Write default config.json if absent
    let config_path = weaver.join("config.json");
    if !config_path.exists() {
        write_weaver_config(project_path, &WeaverConfig::default())?;
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Goals {
    #[serde(default)]
    pub project_word_count: Option<u32>,
    #[serde(default)]
    pub daily_word_count: Option<u32>,
    #[serde(default)]
    pub deadline: Option<String>, // reserved; no behavior yet
}

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
    #[serde(default)]
    pub sticky_categories: Vec<StickyCategory>,
    #[serde(default)]
    pub goals: Goals,
}

pub(crate) fn read_project_json(project_path: &str) -> Result<Project, String> {
    let json_path = Path::new(project_path).join("project.json");
    let content = fs::read_to_string(&json_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub(crate) fn write_project_json(project_path: &str, project: &Project) -> Result<(), String> {
    let json_path = Path::new(project_path).join("project.json");
    let json = serde_json::to_string_pretty(project).map_err(|e| e.to_string())?;
    atomic_write(&json_path, json)
}

#[tauri::command]
pub fn create_project(title: String, author: String, path: String) -> Result<Project, String> {
    let root = Path::new(&path).join(&title);
    let root_str = root.to_string_lossy().to_string();

    fs::create_dir_all(root.join("chapters")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("codex/characters")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("codex/places")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("codex/items")).map_err(|e| e.to_string())?;
    crate::util::ensure_weaver_dir(&root_str)?;
    write_weaver_config(&root_str, &WeaverConfig::default())?;

    let now = chrono::Utc::now().to_rfc3339();
    let default_categories = vec![
        StickyCategory { id: Uuid::new_v4().to_string(), name: "Note".to_string(), color: "zinc".to_string() },
        StickyCategory { id: Uuid::new_v4().to_string(), name: "Research".to_string(), color: "blue".to_string() },
        StickyCategory { id: Uuid::new_v4().to_string(), name: "Reader Feedback".to_string(), color: "amber".to_string() },
        StickyCategory { id: Uuid::new_v4().to_string(), name: "Continuity".to_string(), color: "emerald".to_string() },
    ];
    let project = Project {
        id: Uuid::new_v4().to_string(),
        title: title.clone(),
        author,
        created: now,
        root_path: root.to_string_lossy().to_string(),
        chapters: vec![],
        sticky_categories: default_categories,
        goals: Goals::default(),
    };

    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(root.join("project.json"), json).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn open_project(path: String) -> Result<Project, String> {
    let json_path = Path::new(&path).join("project.json");
    let content = fs::read_to_string(&json_path).map_err(|e| e.to_string())?;
    let mut project: Project = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    project.root_path = path.clone();
    migrate_to_weaver_dir(&path)?;
    Ok(project)
}

#[tauri::command]
pub fn update_project_metadata(
    project_path: String,
    title: String,
    author: String,
) -> Result<Project, String> {
    let mut project = read_project_json(&project_path)?;
    project.title = title;
    project.author = author;
    write_project_json(&project_path, &project)?;
    Ok(project)
}

#[tauri::command]
pub fn update_goals(project_path: String, goals: Goals) -> Result<Project, String> {
    let mut project = read_project_json(&project_path)?;
    project.goals = goals;
    write_project_json(&project_path, &project)?;
    Ok(project)
}
