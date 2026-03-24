import { useState, useRef, useEffect, useCallback } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { LayoutTemplate, FileCode, Eye, WrapText } from 'lucide-react';
import { marked } from 'marked';
import "./App.css";
import { Editor, EditorRef } from "./Editor";
import { ContextSidebar } from "./components/ContextSidebar";
import { Preview } from "./components/Preview";

const appWindow = getCurrentWebviewWindow();

// ... (Theme Definitions omitted for brevity in search, but needed for file content flow if I replaced everything, but I am targeting specific block. Wait, I should target Imports specially if they are far apart)

// Actually, I can't replace non-contiguous blocks with replace_file_content.
// I will use multi_replace_file_content.


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

type ViewMode = 'interactive' | 'raw' | 'markdown';

function stripMarkdown(md: string): string {
  return md
    // Remove fenced code blocks (keep content)
    .replace(/```[a-z]*\n?([\s\S]*?)```/g, '$1')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1')
    // Convert links to their text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove ATX headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold+italic, bold, italic (asterisk and underscore)
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove blockquotes
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers (unordered and ordered)
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("# MarkNowD\n");
  const [editorContext, setEditorContext] = useState<string>("Paragraph");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'interactive';
  });
  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    return localStorage.getItem('wordWrap') !== 'false'; // Default true
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem('theme') || "Dark";
  });
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const editorRef = useRef<EditorRef>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('theme', themeName);
  }, [themeName]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('wordWrap', String(wordWrap));
  }, [wordWrap]);

  useEffect(() => {
    if (filePath) {
      localStorage.setItem('lastFilePath', filePath);
    }
  }, [filePath]);

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

  // Listen for file-open events from file association (e.g., double-clicking a .md file)
  useEffect(() => {
    // Check for initial file from launch arguments (fix for race condition)
    invoke<string | null>('get_launch_file').then(async (path) => {
      // Priority 1: Launch File (Argument)
      if (path) {
        try {
          const content = await readTextFile(path);
          setEditorContent(content);
          setFilePath(path);
          setIsDirty(false);
          return; // Done
        } catch (err) {
          console.error("Failed to open launch file:", err);
          alert("Error opening file: " + JSON.stringify(err));
        }
      }

      // Priority 2: Last Opened File from Persistence
      const lastFile = localStorage.getItem('lastFilePath');
      if (lastFile) {
        try {
          const content = await readTextFile(lastFile);
          setEditorContent(content);
          setFilePath(lastFile);
          setIsDirty(false);
        } catch (err) {
          console.log("Could not load last file (maybe deleted):", err);
          // Optionally clear it? localStorage.removeItem('lastFilePath');
        }
      }
    });

    const unlisten = listen<string>("file-open", async (event) => {
      try {
        const path = event.payload;
        const content = await readTextFile(path);
        setEditorContent(content);
        setFilePath(path);
        setIsDirty(false);
      } catch (err) {
        console.error("Failed to open file from association:", err);
        alert("Error opening file event: " + JSON.stringify(err));
      }
    });

    return () => {
      unlisten.then((fn) => fn());
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
    localStorage.removeItem('lastFilePath'); // Clear last file on new
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

  const getSelectedText = useCallback((): string | null => {
    if (viewMode === 'markdown') {
      const sel = window.getSelection()?.toString();
      return sel || null;
    }
    return editorRef.current?.getSelection() ?? null;
  }, [viewMode]);

  const showToast = useCallback((msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 2000);
  }, []);

  const handleCopyAsMarkdown = useCallback(async () => {
    try {
      const sel = getSelectedText();
      const text = sel ?? editorContent;
      await navigator.clipboard.writeText(text);
      showToast(sel ? 'Selection copied as Markdown' : 'Copied as Markdown');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setIsMenuOpen(false);
  }, [getSelectedText, editorContent, showToast]);

  const handleCopyAsText = useCallback(async () => {
    try {
      const sel = getSelectedText();
      const text = stripMarkdown(sel ?? editorContent);
      await navigator.clipboard.writeText(text);
      showToast(sel ? 'Selection copied as plain text' : 'Copied as plain text');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setIsMenuOpen(false);
  }, [getSelectedText, editorContent, showToast]);

  const handleCopyAsRichText = useCallback(async () => {
    try {
      let html: string;
      let plainText: string;

      if (viewMode === 'markdown') {
        // Use DOM selection HTML when text is selected in the preview
        const winSel = window.getSelection();
        if (winSel && winSel.rangeCount > 0 && winSel.toString()) {
          const container = document.createElement('div');
          container.appendChild(winSel.getRangeAt(0).cloneContents());
          html = container.innerHTML;
          plainText = winSel.toString();
        } else {
          html = marked.parse(editorContent) as string;
          plainText = stripMarkdown(editorContent);
        }
      } else {
        const md = editorRef.current?.getSelection() ?? editorContent;
        html = marked.parse(md) as string;
        plainText = stripMarkdown(md);
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      const hadSel = viewMode === 'markdown'
        ? !!(window.getSelection()?.toString())
        : !!(editorRef.current?.getSelection());
      showToast(hadSel ? 'Selection copied as Rich Text' : 'Copied as Rich Text');
    } catch (err) {
      console.error('Failed to copy as rich text:', err);
    }
    setIsMenuOpen(false);
  }, [viewMode, editorContent, showToast]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        handleCopyAsMarkdown();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleCopyAsMarkdown]);

  const handleInsertImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
        }]
      });

      if (selected && editorRef.current) {
        const path = selected as string;
        // Tauri 2.0 asset protocol or just file path?
        // Usually file path works with the `fs` scope, but for <img> tags we might need `asset://` or `convertFileSrc`.
        // For standard markdown editors, usually just the path is inserted or a relative path.
        // Let's insert the absolute path for now.
        const markdownImage = `![Image](${path})`;
        editorRef.current.insertText(markdownImage);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to insert image");
    }
  };

  const handleAction = (action: string) => {
    if (editorRef.current) {
      if (action === 'insert-image') {
        handleInsertImage();
      } else {
        editorRef.current.executeCommand(action);
      }
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden text-sm transition-colors duration-200"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
    >
      {/* Custom Titlebar / Menu Bar */}
      <div
        className="h-10 flex items-center justify-between shrink-0 select-none transition-colors duration-200"
        style={{ backgroundColor: currentTheme.menuBg, cursor: 'default' }}
        onMouseDown={(e) => {
          // Only drag if the target is the div itself or non-interactive children
          if (e.target === e.currentTarget || (e.target as Element).classList.contains('flex-1')) {
            appWindow.startDragging();
          }
        }}
      >
        {/* Window Controls (Left for macOS) */}
        {navigator.userAgent.includes('Mac') && (
          <div className="flex z-10 pl-2 gap-2" style={{ backgroundColor: currentTheme.menuBg }}>
            <div
              className={`inline-flex justify-center items-center w-3 h-3 rounded-full bg-red-500 text-transparent hover:text-black mt-3.5 mb-3.5 cursor-pointer transition-colors border border-red-600`}
              onClick={() => appWindow.close()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1L9 9M9 1L1 9"></path></svg>
            </div>
            <div
              className={`inline-flex justify-center items-center w-3 h-3 rounded-full bg-yellow-500 text-transparent hover:text-black mt-3.5 mb-3.5 cursor-pointer transition-colors border border-yellow-600`}
              onClick={() => appWindow.minimize()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg width="6" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"></rect></svg>
            </div>
            <div
              className={`inline-flex justify-center items-center w-3 h-3 rounded-full bg-green-500 text-transparent hover:text-black mt-3.5 mb-3.5 cursor-pointer transition-colors border border-green-600`}
              onClick={() => appWindow.toggleMaximize().catch(e => alert("Max Err: " + e))}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 5L5 9L9 1"></path></svg>
            </div>
          </div>
        )}

        {/* Left Side: Menu */}
        <div className={`flex items-center gap-2 ${navigator.userAgent.includes('Mac') ? 'pl-4' : 'pl-4'} z-10`}>

          {/* File Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsThemeMenuOpen(false); }}
              className={`px-3 py-1 rounded transition-colors ${currentTheme.menuHover}`}
              onMouseDown={(e) => e.stopPropagation()}
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
                <div className={`border-t my-1 ${currentTheme.menuBorder}`}></div>
                <button onClick={handleCopyAsMarkdown} className={`text-left px-4 py-2 ${currentTheme.menuHover} flex items-center justify-between`}>
                  <span>Copy as Markdown</span>
                  <span className="opacity-50 text-xs ml-4">⌃⇧C</span>
                </button>
                <button onClick={handleCopyAsText} className={`text-left px-4 py-2 ${currentTheme.menuHover}`}>
                  Copy as Plain Text
                </button>
                <button onClick={handleCopyAsRichText} className={`text-left px-4 py-2 ${currentTheme.menuHover}`}>
                  Copy as Rich Text
                </button>
              </div>
            )}
          </div>

          {/* Theme Menu */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => { setIsThemeMenuOpen(!isThemeMenuOpen); setIsMenuOpen(false); }}
              className={`px-3 py-1 rounded transition-colors ${currentTheme.menuHover}`}
              onMouseDown={(e) => e.stopPropagation()}
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
        <div
          className="flex-1 h-full"
          onMouseDown={() => appWindow.startDragging()}
        ></div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1 z-10 mr-4">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded transition-colors ${wordWrap ? 'bg-black/10 text-blue-400' : 'opacity-50 hover:opacity-100'}`}
            title="Toggle Word Wrap"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <WrapText size={14} />
          </button>
          <div className="w-px h-4 bg-gray-500/20 mx-1"></div>
          <button
            onClick={() => setViewMode('interactive')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'interactive' ? 'bg-black/10 text-blue-400' : 'opacity-50 hover:opacity-100'}`}
            title="Interactive Mode"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <LayoutTemplate size={14} />
          </button>
          <button
            onClick={() => setViewMode('markdown')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'markdown' ? 'bg-black/10 text-blue-400' : 'opacity-50 hover:opacity-100'}`}
            title="Preview Mode"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'raw' ? 'bg-black/10 text-blue-400' : 'opacity-50 hover:opacity-100'}`}
            title="Raw Mode"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <FileCode size={14} />
          </button>
        </div>

        {/* Window Controls (Right for non-macOS) */}
        {!navigator.userAgent.includes('Mac') && (
          <div className="flex z-10" style={{ backgroundColor: currentTheme.menuBg }}>
            <div
              className={`inline-flex justify-center items-center w-12 h-10 cursor-pointer transition-colors ${currentTheme.menuHover}`}
              onClick={() => appWindow.minimize()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"></rect></svg>
            </div>
            <div
              className={`inline-flex justify-center items-center w-12 h-10 cursor-pointer transition-colors ${currentTheme.menuHover}`}
              onClick={() => appWindow.toggleMaximize().catch(e => alert("Max Err: " + e))}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"></rect></svg>
            </div>
            <div
              className="inline-flex justify-center items-center w-12 h-10 hover:bg-red-600 hover:text-white cursor-pointer transition-colors"
              onClick={() => appWindow.close()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 1L9 9M9 1L1 9"></path></svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative border-t flex flex-row" style={{ borderColor: currentTheme.menuBorder }}>
        {/* Sidebar: Only show in 'interactive' mode */}
        {viewMode === 'interactive' && (
          <ContextSidebar context={editorContext} themeStyle={currentTheme} onAction={handleAction} />
        )}

        <div className="flex-1 h-full relative">
          {viewMode === 'markdown' ? (
            <Preview content={editorContent} themeStyle={currentTheme} />
          ) : (
            <div className="h-full w-full">
              <Editor
                ref={editorRef}
                doc={editorContent}
                onChange={handleEditorChange}
                onContextChange={setEditorContext}
                themeName={themeName}
                filePath={filePath}
                viewMode={viewMode === 'interactive' ? 'interactive' : 'raw'}
                wordWrap={wordWrap}
              />
            </div>
          )}
          {/* Copy toast */}
          {copyToast && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-xs font-medium shadow-lg pointer-events-none select-none"
              style={{ backgroundColor: currentTheme.menuBg, color: currentTheme.text, border: `1px solid`, borderColor: currentTheme.menuBorder }}>
              {copyToast}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
