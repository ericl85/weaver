use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs;

use crate::util::{atomic_write, weaver_dir};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThemeManifest {
    pub name: String,
    pub version: String,
    pub author: String,
    #[serde(default)]
    pub modes: Vec<String>,
}

/// Reject path traversal / nested paths in a theme name. The theme folder is the
/// addressable unit, so a name must be a single, simple path component.
fn validate_theme_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name == "."
        || name == ".."
        || name.contains('/')
        || name.contains('\\')
    {
        return Err(format!("invalid theme name: {name}"));
    }
    Ok(())
}

/// Scan `.weaver/themes/*/manifest.json`, returning every valid manifest. Folders
/// with a missing or malformed manifest are skipped rather than erroring. The
/// built-in "Default" theme is not a folder and is not listed here — the frontend
/// presents it as the always-available "no override" option.
#[tauri::command]
pub fn list_themes(project_path: String) -> Result<Vec<ThemeManifest>, String> {
    let themes_dir = weaver_dir(&project_path).join("themes");
    if !themes_dir.exists() {
        return Ok(vec![]);
    }

    let mut manifests = Vec::new();
    for entry in fs::read_dir(&themes_dir).map_err(|e| e.to_string())? {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let manifest_path = path.join("manifest.json");
        let content = match fs::read_to_string(&manifest_path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        match serde_json::from_str::<ThemeManifest>(&content) {
            Ok(manifest) => manifests.push(manifest),
            Err(_) => continue,
        }
    }
    Ok(manifests)
}

/// Read the raw CSS for a theme. Always reads fresh from disk (no caching) so
/// editing a theme file and reloading takes effect immediately.
#[tauri::command]
pub fn read_theme_css(project_path: String, name: String) -> Result<String, String> {
    validate_theme_name(&name)?;
    let css_path = weaver_dir(&project_path)
        .join("themes")
        .join(&name)
        .join("theme.css");
    fs::read_to_string(&css_path).map_err(|e| e.to_string())
}

/// Read the active theme name from `.weaver/config.json`. `None` (or a missing
/// config) means the built-in Default theme.
#[tauri::command]
pub fn get_active_theme(project_path: String) -> Result<Option<String>, String> {
    let path = weaver_dir(&project_path).join("config.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: Map<String, Value> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config
        .get("activeTheme")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string()))
}

/// Persist the active theme name into `.weaver/config.json`. `None` clears it back
/// to Default. Other keys in the config are preserved (read-modify-write of the raw
/// JSON object rather than a typed struct).
#[tauri::command]
pub fn set_active_theme(project_path: String, name: Option<String>) -> Result<(), String> {
    if let Some(ref n) = name {
        validate_theme_name(n)?;
    }

    let path = weaver_dir(&project_path).join("config.json");
    let mut config: Map<String, Value> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        Map::new()
    };

    match name {
        Some(n) => {
            config.insert("activeTheme".to_string(), Value::String(n));
        }
        None => {
            config.insert("activeTheme".to_string(), Value::Null);
        }
    }

    let json = serde_json::to_string_pretty(&Value::Object(config)).map_err(|e| e.to_string())?;
    atomic_write(&path, json)
}
