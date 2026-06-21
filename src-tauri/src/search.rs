use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::project::read_project_json;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Occurrence {
    pub ordinal: u32,
    pub matched_alias: String,
    pub snippet: String,
    pub snippet_match_start: u32,
    pub snippet_match_len: u32,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceHit {
    pub chapter: String,
    pub occurrences: Vec<Occurrence>,
}

/// Apostrophes count as word chars (O'Brien); hyphens do not (Jean-Luc splits).
fn is_word_char(c: char) -> bool {
    c.is_alphanumeric() || c == '\''
}

/// Return byte ranges of all whole-word, non-overlapping occurrences of `needle`
/// in `content_cmp` (pre-transformed for case), using `content` (original) for
/// boundary checks. Returns an empty vec for an empty needle.
fn find_whole_word_occurrences(
    content: &str,
    content_cmp: &str,
    needle: &str,
) -> Vec<(usize, usize)> {
    let needle_len = needle.len();
    if needle_len == 0 {
        return vec![];
    }
    let mut results = Vec::new();
    let mut search_from = 0usize;
    while search_from + needle_len <= content_cmp.len() {
        let Some(rel) = content_cmp[search_from..].find(needle) else {
            break;
        };
        let abs_start = search_from + rel;
        let abs_end = abs_start + needle_len;

        // Skip if the match straddles a UTF-8 char boundary (can happen with
        // case-folded multi-byte chars whose byte lengths differ from the original).
        if !content.is_char_boundary(abs_start) || !content.is_char_boundary(abs_end) {
            search_from = abs_start + 1;
            continue;
        }

        let before_ok = abs_start == 0
            || content[..abs_start]
                .chars()
                .next_back()
                .map_or(true, |c| !is_word_char(c));
        let after_ok = abs_end >= content.len()
            || content[abs_end..]
                .chars()
                .next()
                .map_or(true, |c| !is_word_char(c));

        if before_ok && after_ok {
            results.push((abs_start, abs_end));
            // Advance past the full match to avoid overlapping occurrences of the
            // same needle.
            search_from = abs_end;
        } else {
            // Advance by one char so we don't re-examine the same position.
            search_from = abs_start
                + content[abs_start..]
                    .chars()
                    .next()
                    .map_or(1, |c| c.len_utf8());
        }
    }
    results
}

/// Build a context snippet ±40 chars around [match_byte_start..match_byte_end].
/// Returns (snippet, char_offset_within_snippet, char_length_of_match).
fn build_snippet(content: &str, match_byte_start: usize, match_byte_end: usize) -> (String, u32, u32) {
    const CTX: usize = 40;

    // Collect byte offsets of each char start so we can convert between byte
    // and char coordinates without panicking on multi-byte chars.
    let byte_starts: Vec<usize> = content.char_indices().map(|(b, _)| b).collect();
    let char_count = byte_starts.len();

    let match_char_start = byte_starts.partition_point(|&b| b < match_byte_start);
    let match_char_end = byte_starts.partition_point(|&b| b < match_byte_end);

    let snip_char_start = match_char_start.saturating_sub(CTX);
    let snip_char_end = (match_char_end + CTX).min(char_count);

    let byte_from = byte_starts[snip_char_start];
    let byte_to = if snip_char_end < char_count {
        byte_starts[snip_char_end]
    } else {
        content.len()
    };

    let snippet = content[byte_from..byte_to].to_string();
    let snippet_match_start = (match_char_start - snip_char_start) as u32;
    let snippet_match_len = (match_char_end - match_char_start) as u32;

    (snippet, snippet_match_start, snippet_match_len)
}

/// Scan a chapter's content for all alias matches and return deduplicated,
/// manuscript-ordered occurrences.
///
/// Ordinals are scoped per alias across its *full* occurrence list (including
/// spans that get deduped out in favour of a longer match). This lets the
/// frontend reproduce any ordinal by simply counting whole-word matches of
/// `matched_alias` in the live editor, which never sees the dedup logic.
fn scan_chapter(content: &str, aliases: &[String], match_case: bool) -> Vec<Occurrence> {
    let content_cmp = if match_case {
        content.to_string()
    } else {
        content.to_lowercase()
    };

    // (byte_start, byte_end, alias_index, alias_ordinal)
    let mut raw: Vec<(usize, usize, usize, u32)> = Vec::new();

    for (i, alias) in aliases.iter().enumerate() {
        let trimmed = alias.trim();
        if trimmed.is_empty() {
            continue;
        }
        let needle = if match_case {
            trimmed.to_string()
        } else {
            trimmed.to_lowercase()
        };
        for (ordinal, (s, e)) in
            find_whole_word_occurrences(content, &content_cmp, &needle)
                .into_iter()
                .enumerate()
        {
            raw.push((s, e, i, ordinal as u32));
        }
    }

    if raw.is_empty() {
        return vec![];
    }

    // Sort by start asc, then by match length desc so that longer aliases
    // (e.g. "Captain Aldric") beat shorter ones ("Aldric") when they overlap.
    raw.sort_by(|a, b| {
        a.0.cmp(&b.0)
            .then_with(|| (b.1 - b.0).cmp(&(a.1 - a.0)))
    });

    // Greedy, non-overlapping selection.
    let mut selected: Vec<(usize, usize, usize, u32)> = Vec::new();
    let mut max_end = 0usize;
    for item @ (s, e, ..) in raw {
        if s >= max_end {
            max_end = e;
            selected.push(item);
        }
    }

    // `selected` is already in document order (sorted by s asc above).
    selected
        .into_iter()
        .map(|(byte_start, byte_end, alias_idx, ordinal)| {
            let (snippet, snippet_match_start, snippet_match_len) =
                build_snippet(content, byte_start, byte_end);
            Occurrence {
                ordinal,
                matched_alias: aliases[alias_idx].trim().to_string(),
                snippet,
                snippet_match_start,
                snippet_match_len,
            }
        })
        .collect()
}

/// Return every manuscript passage that mentions any of the given aliases,
/// grouped by chapter in manuscript order.
///
/// `aliases` should include the entity's canonical title. `match_case` comes
/// from the entity's YAML frontmatter.
#[tauri::command]
pub fn find_references(
    root_path: String,
    aliases: Vec<String>,
    match_case: bool,
) -> Result<Vec<ReferenceHit>, String> {
    let project = read_project_json(&root_path)?;
    let chapters_dir = Path::new(&root_path).join("chapters");
    let mut hits = Vec::new();

    for filename in &project.chapters {
        let content = match fs::read_to_string(chapters_dir.join(filename)) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let occurrences = scan_chapter(&content, &aliases, match_case);
        if !occurrences.is_empty() {
            hits.push(ReferenceHit {
                chapter: filename.clone(),
                occurrences,
            });
        }
    }

    Ok(hits)
}

/// Return every manuscript passage that contains the given free-text query,
/// grouped by chapter in manuscript order.
///
/// Returns an empty result for a blank query.
#[tauri::command]
pub fn search_text(
    root_path: String,
    query: String,
    match_case: bool,
) -> Result<Vec<ReferenceHit>, String> {
    let trimmed = query.trim().to_string();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }

    let project = read_project_json(&root_path)?;
    let chapters_dir = Path::new(&root_path).join("chapters");
    let mut hits = Vec::new();

    for filename in &project.chapters {
        let content = match fs::read_to_string(chapters_dir.join(filename)) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let content_cmp = if match_case {
            content.clone()
        } else {
            content.to_lowercase()
        };
        let needle = if match_case {
            trimmed.clone()
        } else {
            trimmed.to_lowercase()
        };

        let matches = find_whole_word_occurrences(&content, &content_cmp, &needle);
        if matches.is_empty() {
            continue;
        }

        let occurrences = matches
            .into_iter()
            .enumerate()
            .map(|(ordinal, (byte_start, byte_end))| {
                let (snippet, snippet_match_start, snippet_match_len) =
                    build_snippet(&content, byte_start, byte_end);
                Occurrence {
                    ordinal: ordinal as u32,
                    matched_alias: trimmed.clone(),
                    snippet,
                    snippet_match_start,
                    snippet_match_len,
                }
            })
            .collect();

        hits.push(ReferenceHit {
            chapter: filename.clone(),
            occurrences,
        });
    }

    Ok(hits)
}
