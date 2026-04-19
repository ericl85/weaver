#[cfg(target_os = "macos")]
pub fn install_macos_menu(app: &tauri::App) -> Result<(), tauri::Error> {
    use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};

    let new_project = MenuItem::with_id(app, "new-project", "New Project", true, None::<&str>)?;
    let open_project = MenuItem::with_id(app, "open-project", "Open Project", true, None::<&str>)?;
    let save = MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
    let close_project = MenuItem::with_id(app, "close-project", "Close Project", true, None::<&str>)?;
    let project_settings = MenuItem::with_id(app, "open-settings", "Project Settings\u{2026}", true, Some("Cmd+,"))?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit Weaver"))?;
    let file_menu = SubmenuBuilder::new(app, "File")
        .items(&[&new_project, &open_project, &sep1, &save, &close_project, &sep2, &project_settings, &sep3, &quit])
        .build()?;

    let undo = PredefinedMenuItem::undo(app, None)?;
    let redo = PredefinedMenuItem::redo(app, None)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;
    let edit_sep = PredefinedMenuItem::separator(app)?;
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .items(&[&undo, &redo, &edit_sep, &cut, &copy, &paste, &select_all])
        .build()?;

    let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;
    let view_menu = SubmenuBuilder::new(app, "View")
        .items(&[&fullscreen])
        .build()?;

    let minimize = PredefinedMenuItem::minimize(app, None)?;
    let close_window = PredefinedMenuItem::close_window(app, None)?;
    let window_menu = SubmenuBuilder::new(app, "Window")
        .items(&[&minimize, &close_window])
        .build()?;

    let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &window_menu])
        .build()?;
    app.set_menu(menu)?;

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn install_macos_menu(_app: &tauri::App) -> Result<(), tauri::Error> {
    Ok(())
}
