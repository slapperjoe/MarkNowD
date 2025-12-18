import { useState, useRef, useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import "./App.css";
import { Editor } from "./Editor";

const appWindow = getCurrentWebviewWindow();

// Theme Definitions for the UI (Outside the editor)
const THEMES: Record<string, { bg: string; menuBg: string; text: string; menuHover: string; menuBorder: string; menuDropdownBg: string }> = {
  "Dark": {
    bg: "#282c34",
    menuBg: "#21252b",
    text: "#ffffff",
    menuHover: "hover:bg-gray-700",
    menuBorder: "border-gray-600",
    menuDropdownBg: "bg-[#333842]"
  },
  "Light": {
    bg: "#ffffff",
    menuBg: "#f0f0f0",
    text: "#000000",
    menuHover: "hover:bg-gray-200",
    menuBorder: "border-gray-300",
    menuDropdownBg: "bg-white"
  },
  "Solarized Light": {
    bg: "#fdf6e3",
    menuBg: "#eee8d5",
    text: "#657b83",
    menuHover: "hover:bg-[#d5ccb8]",
    menuBorder: "border-[#d5ccb8]",
    menuDropdownBg: "bg-[#fdf6e3]"
  },
  "Solarized Dark": {
    bg: "#002b36",
    menuBg: "#073642",
    text: "#839496",
    menuHover: "hover:bg-[#094657]",
    menuBorder: "border-[#094657]",
    menuDropdownBg: "bg-[#002b36]"
  }
};

function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("# MarkNowD\n");
  const [isDirty, setIsDirty] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [themeName, setThemeName] = useState("Dark");

  const menuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEditorChange = (newContent: string) => {
    setEditorContent(newContent);
    if (!isDirty) setIsDirty(true);
  };

  const currentTheme = THEMES[themeName];

  const handleNew = async () => {
    if (isDirty) {
      const confirm = await window.confirm("You have unsaved changes. Discard them?");
      if (!confirm) return;
    }
    setEditorContent("# MarkNowD\n");
    setFilePath(null);
    setIsDirty(false);
    setIsMenuOpen(false);
  };

  const handleOpen = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      });

      if (selected) {
        const path = selected as string;
        const content = await readTextFile(path);
        setEditorContent(content);
        setFilePath(path);
        setIsDirty(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to open file");
    }
    setIsMenuOpen(false);
  };

  const handleSave = async () => {
    if (!filePath) {
      await handleSaveAs();
      return;
    }
    try {
      await writeTextFile(filePath, editorContent);
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save file.");
    }
    setIsMenuOpen(false);
  };

  const handleSaveAs = async () => {
    try {
      const path = await save({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      });
      if (path) {
        await writeTextFile(path, editorContent);
        setFilePath(path);
        setIsDirty(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save file.");
    }
    setIsMenuOpen(false);
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden text-sm transition-colors duration-200"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
    >
      {/* Custom Titlebar / Menu Bar */}
      {/* Custom Titlebar / Menu Bar */}
      <div
        className="h-10 flex items-center justify-between shrink-0 select-none transition-colors duration-200"
        style={{ backgroundColor: currentTheme.menuBg }}
      >

        {/* Left Side: Menu */}
        <div className="flex items-center gap-2 pl-4 z-10">

          {/* File Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`px-3 py-1 rounded transition-colors ${currentTheme.menuHover}`}
            >
              File
            </button>
            {isMenuOpen && (
              <div
                className={`absolute top-full left-0 mt-1 w-40 rounded shadow-lg border z-50 flex flex-col py-1 ${currentTheme.menuDropdownBg} ${currentTheme.menuBorder}`}
              >
                <button onClick={handleNew} className={`text-left px-4 py-2 ${currentTheme.menuHover}`}>New</button>
                <button onClick={handleOpen} className={`text-left px-4 py-2 ${currentTheme.menuHover}`}>Open...</button>
                <button onClick={handleSave} className={`text-left px-4 py-2 ${currentTheme.menuHover}`}>Save</button>
                <button onClick={handleSaveAs} className={`text-left px-4 py-2 ${currentTheme.menuHover}`}>Save As...</button>
              </div>
            )}
          </div>

          {/* Theme Menu */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className={`px-3 py-1 rounded transition-colors ${currentTheme.menuHover}`}
            >
              Theme
            </button>
            {isThemeMenuOpen && (
              <div
                className={`absolute top-full left-0 mt-1 w-40 rounded shadow-lg border z-50 flex flex-col py-1 ${currentTheme.menuDropdownBg} ${currentTheme.menuBorder}`}
              >
                {Object.keys(THEMES).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setThemeName(t); setIsThemeMenuOpen(false); }}
                    className={`text-left px-4 py-2 ${currentTheme.menuHover} ${themeName === t ? 'font-bold' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="text-xs opacity-60 flex items-center gap-2 ml-4 cursor-default">
            {isDirty && <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>}
            {filePath ? filePath : "Untitled"}
          </div>
        </div>

        {/* Drag Region Spacer */}
        <div data-tauri-drag-region className="flex-1 h-full"></div>

        {/* Right Side: Window Controls */}
        <div className="flex z-10" style={{ backgroundColor: currentTheme.menuBg }}>
          <div
            className={`inline-flex justify-center items-center w-12 h-10 cursor-pointer transition-colors ${currentTheme.menuHover}`}
            onClick={() => appWindow.minimize()}
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"></rect></svg>
          </div>
          <div
            className={`inline-flex justify-center items-center w-12 h-10 cursor-pointer transition-colors ${currentTheme.menuHover}`}
            onClick={() => appWindow.toggleMaximize()}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"></rect></svg>
          </div>
          <div
            className="inline-flex justify-center items-center w-12 h-10 hover:bg-red-600 hover:text-white cursor-pointer transition-colors"
            onClick={() => appWindow.close()}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 1L9 9M9 1L1 9"></path></svg>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative border-t" style={{ borderColor: currentTheme.menuBorder }}>
        <Editor doc={editorContent} onChange={handleEditorChange} themeName={themeName} />
      </div>
    </div>
  );
}

export default App;
