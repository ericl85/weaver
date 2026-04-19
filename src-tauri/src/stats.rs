use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use crate::project::read_project_json;
use crate::util::atomic_write;

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub version: u32,
    pub current_day: Option<CurrentDay>,
    pub daily_history: BTreeMap<String, DayEntry>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CurrentDay {
    pub date: String,
    pub starting_word_count: i64,
    pub celebrated: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DayEntry {
    pub words_written: i64,
    pub total_at_end_of_day: i64,
}

fn stats_path(project_path: &str) -> std::path::PathBuf {
    Path::new(project_path).join("stats.json")
}

fn read_stats_from_disk(project_path: &str) -> Result<Stats, String> {
    let path = stats_path(project_path);
    if !path.exists() {
        return Ok(Stats { version: 1, current_day: None, daily_history: BTreeMap::new() });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_stats_to_disk(project_path: &str, stats: &Stats) -> Result<(), String> {
    let path = stats_path(project_path);
    let json = serde_json::to_string_pretty(stats).map_err(|e| e.to_string())?;
    atomic_write(&path, json)
}

fn today_local() -> String {
    chrono::Local::now().date_naive().format("%Y-%m-%d").to_string()
}

/// Counts words in Markdown, stripping HTML comments and fenced code blocks.
fn count_words_in_markdown(md: &str) -> i64 {
    let mut count: i64 = 0;
    let mut in_code_fence = false;
    let mut in_comment = false;

    for line in md.lines() {
        let trimmed = line.trim_start();

        if trimmed.starts_with("```") {
            in_code_fence = !in_code_fence;
            continue;
        }

        if in_code_fence {
            continue;
        }

        // Strip HTML comments (possibly spanning lines), count remaining words.
        let mut s = line;
        let mut clean = String::new();

        loop {
            if in_comment {
                if let Some(end) = s.find("-->") {
                    in_comment = false;
                    s = &s[end + 3..];
                } else {
                    break; // rest of line is inside a comment
                }
            } else if let Some(start) = s.find("<!--") {
                clean.push_str(&s[..start]);
                in_comment = true;
                s = &s[start + 4..];
            } else {
                clean.push_str(s);
                break;
            }
        }

        count += clean.split_whitespace().count() as i64;
    }

    count
}

fn count_project_words_impl(project_path: &str) -> Result<i64, String> {
    let project = read_project_json(project_path)?;
    let chapters_dir = Path::new(project_path).join("chapters");
    let mut total: i64 = 0;
    for filename in &project.chapters {
        let path = chapters_dir.join(filename);
        if !path.exists() {
            continue;
        }
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        total += count_words_in_markdown(&raw);
    }
    Ok(total)
}

#[tauri::command]
pub fn count_project_words(project_path: String) -> Result<i64, String> {
    count_project_words_impl(&project_path)
}

#[tauri::command]
pub fn read_stats(project_path: String) -> Result<Stats, String> {
    read_stats_from_disk(&project_path)
}

#[tauri::command]
pub fn update_daily_progress(project_path: String, current_word_count: i64) -> Result<Stats, String> {
    let today = today_local();
    let mut stats = read_stats_from_disk(&project_path)?;
    let current_day = stats.current_day.clone();

    match current_day {
        None => {
            stats.current_day = Some(CurrentDay {
                date: today,
                starting_word_count: current_word_count,
                celebrated: false,
            });
        }
        Some(cur) if cur.date == today => {
            let words_written = current_word_count - cur.starting_word_count;
            stats.daily_history.insert(today, DayEntry {
                words_written,
                total_at_end_of_day: current_word_count,
            });
        }
        Some(cur) => {
            // Day rolled over — commit previous day if no entry exists, then reset baseline.
            if !stats.daily_history.contains_key(&cur.date) {
                stats.daily_history.insert(cur.date.clone(), DayEntry {
                    words_written: 0,
                    total_at_end_of_day: cur.starting_word_count,
                });
            }
            stats.current_day = Some(CurrentDay {
                date: today,
                starting_word_count: current_word_count,
                celebrated: false,
            });
        }
    }

    write_stats_to_disk(&project_path, &stats)?;
    Ok(stats)
}

#[tauri::command]
pub fn mark_celebrated(project_path: String) -> Result<Stats, String> {
    let mut stats = read_stats_from_disk(&project_path)?;
    if let Some(ref mut cur) = stats.current_day {
        cur.celebrated = true;
    }
    write_stats_to_disk(&project_path, &stats)?;
    Ok(stats)
}
