use std::fs;
use std::path::Path;

pub(crate) fn title_to_slug(title: &str) -> String {
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

pub(crate) fn slug_to_title(filename: &str) -> String {
    let stem = filename.trim_end_matches(".md").replace('-', " ");
    let mut chars = stem.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}

pub(crate) fn atomic_write(path: impl AsRef<Path>, content: impl AsRef<[u8]>) -> Result<(), String> {
    let path = path.as_ref();
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("file");
    let tmp = path.with_file_name(format!(".{}.tmp", file_name));
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}
