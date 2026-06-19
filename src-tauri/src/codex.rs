use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::util::{atomic_write, title_to_slug};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodexEntry {
    pub id: String,
    pub title: String,
    pub category: String,
    pub filename: String,
    pub aliases: Vec<String>,
    pub match_case: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReadCodexResult {
    pub entry: CodexEntry,
    pub content: String,
}

// Parse YAML frontmatter from a codex file.
// Returns (aliases, match_case, body_without_frontmatter).
// Only the leading `---\n…\n---` block is treated as frontmatter (line 1 must be exactly `---`).
fn parse_frontmatter(raw: &str) -> (Vec<String>, bool, String) {
    let normalized = raw.replace("\r\n", "\n");
    if !normalized.starts_with("---\n") {
        return (vec![], true, normalized);
    }
    // Find the closing ---
    let after_open = &normalized["---\n".len()..];
    let close_pos = after_open.find("\n---\n").or_else(|| {
        // Handle file ending with \n---\n or \n---<eof>
        after_open
            .strip_suffix("\n---")
            .map(|s| s.len())
    });
    let Some(close) = close_pos else {
        // No closing fence — treat whole file as body
        return (vec![], true, normalized);
    };
    let fm_text = &after_open[..close];
    let body = after_open[close + "\n---".len()..].trim_start_matches('\n').to_string();

    let mut aliases: Vec<String> = vec![];
    let mut match_case = true;

    // Minimal YAML line parser: only handle `key: value` and list items `- value`
    let mut in_aliases = false;
    for line in fm_text.lines() {
        if let Some(rest) = line.strip_prefix("aliases:") {
            let rest = rest.trim();
            if rest.is_empty() {
                in_aliases = true;
            } else {
                // Inline sequence not supported; ignore
                in_aliases = false;
            }
        } else if let Some(rest) = line.strip_prefix("matchCase:") {
            in_aliases = false;
            let val = rest.trim().to_lowercase();
            match_case = val != "false";
        } else if in_aliases {
            if let Some(item) = line.trim().strip_prefix("- ") {
                let item = item.trim_matches('"').trim_matches('\'');
                if !item.is_empty() {
                    aliases.push(item.to_string());
                }
            } else if line.starts_with(|c: char| c.is_alphabetic()) {
                // New top-level key — stop collecting aliases
                in_aliases = false;
            }
        }
    }

    (aliases, match_case, body)
}

// Serialize aliases and match_case back to a frontmatter block.
// Returns None when no frontmatter is needed (default state).
fn serialize_frontmatter(aliases: &[String], match_case: bool) -> Option<String> {
    let has_aliases = !aliases.is_empty();
    let non_default_case = !match_case;
    if !has_aliases && !non_default_case {
        return None;
    }
    let mut out = String::from("---\n");
    if has_aliases {
        out.push_str("aliases:\n");
        for alias in aliases {
            out.push_str(&format!("  - {}\n", alias));
        }
    }
    if non_default_case {
        out.push_str("matchCase: false\n");
    }
    out.push_str("---\n");
    Some(out)
}

fn build_file_content(aliases: &[String], match_case: bool, body: &str) -> String {
    match serialize_frontmatter(aliases, match_case) {
        Some(fm) => format!("{}\n{}", fm, body),
        None => body.to_string(),
    }
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
            // Read frontmatter for aliases/matchCase
            let raw = fs::read_to_string(file_entry.path()).unwrap_or_default();
            let (aliases, match_case, _) = parse_frontmatter(&raw);
            entries.push(CodexEntry {
                id: format!("{}/{}", category, name),
                title,
                category: category.clone(),
                filename: name,
                aliases,
                match_case,
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
) -> Result<ReadCodexResult, String> {
    let path = Path::new(&project_path)
        .join("codex")
        .join(&category)
        .join(&filename);
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let (aliases, match_case, content) = parse_frontmatter(&raw);
    let stem = filename.trim_end_matches(".md");
    let title_raw = stem.replace('-', " ");
    let title = {
        let mut chars = title_raw.chars();
        match chars.next() {
            None => String::new(),
            Some(c) => c.to_uppercase().to_string() + chars.as_str(),
        }
    };
    Ok(ReadCodexResult {
        entry: CodexEntry {
            id: format!("{}/{}", category, filename),
            title,
            category,
            filename,
            aliases,
            match_case,
        },
        content,
    })
}

#[tauri::command]
pub fn save_codex_entry(
    project_path: String,
    category: String,
    filename: String,
    content: String,
    aliases: Vec<String>,
    match_case: bool,
) -> Result<(), String> {
    let path = Path::new(&project_path)
        .join("codex")
        .join(&category)
        .join(&filename);
    let file_content = build_file_content(&aliases, match_case, &content);
    atomic_write(&path, file_content)
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
        aliases: vec![],
        match_case: true,
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
