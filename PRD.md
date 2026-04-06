# Product Requirements

## Overview

Weaver is a minimalist, distraction-free, offline first novel writing platform.

## Features

### Writing

- Users write in Markdown
- Users write Chapters or Codex entries, not files directly.
- The underlying storage underneath is an opinionated project structure of files with text files that is easy to synchronize with a Git repository. JSON files for outlines / notes / codex and project information is acceptable but feel free to think outside the box.
- The format should also make it easy to use pandoc or other tool to produce PDFs from chapters or ebook reader files. See mattgemmell/pandoc-publish for a general structure we might want to go with for chapters.

### Outlining

- Users can write chapter outlines or notes referencing a section of the chapter. These shouldn't be different conceptually. Chapter Outline, Reader Feedback, Todo List, etc. are things that will reference text in the chapter itself.
- When selecting an specific outline item, it should zip to the part of the text it's referencing.
- When editing text, the outline should show the relevant items
- Outline / notes should be available as a sidebar

### AI

- Though we won't be adding any AI features at first, UI and product design should be designed such that it is an easy and obvious addition, especially agentic writing, and agent chat that would have access to the text you're looking at to provide live feedback.
- All AI features would be available as a sidebar.

### Preview

- Previewing Markdown should be available as a sidebar.

### Theming

- User should be able to change text display. Font, color, background, etc... things a user might change to make things more inviting for them.
- User should be able to save and export themes.
