# MarkNowD – Copilot Instructions

MarkNowD is a cross-platform Markdown editor built with **Tauri v2** (Rust backend) + **React 19 + TypeScript** (frontend), using **CodeMirror 6** as the editor engine and **Tailwind CSS** for styling.

## Build & Dev Commands

```bash
# Install dependencies
npm install

# Run dev server (starts Vite + Tauri shell together)
npm run tauri dev

# Production build (also auto-bumps patch version)
npm run tauri build
# or
npm run installer   # npm run build + tauri build

# Frontend-only build (no Tauri)
npm run build       # tsc + vite build
```

There are no automated tests in this project.

## Version Bumping

`bump-version.js` runs automatically before every `tauri` or `tauri:build` script invocation. It increments the patch version in **both** `package.json` and `src-tauri/tauri.conf.json`. Never update version numbers in those files manually.

## Architecture

```
src/              # React/TypeScript frontend
  App.tsx         # Root: state, file I/O, menu, theme, view switching
  Editor.tsx      # CodeMirror 6 wrapper (forwardRef, imperative EditorRef API)
  hybridPlugin.ts # CodeMirror ViewPlugin that renders Markdown decorations inline
  components/
    ContextSidebar.tsx  # Context-aware formatting toolbar (adapts to cursor node type)
    Preview.tsx         # Full rendered Markdown preview (react-markdown + remark-gfm)

src-tauri/
  src/lib.rs      # Tauri commands + file-association handling (macOS & Windows)
  tauri.conf.json # App config: window, bundle targets (dmg, nsis), file associations
```

### Key Data Flow

1. **App.tsx** holds all state (`editorContent`, `filePath`, `viewMode`, `themeName`, `wordWrap`). User preferences are persisted to `localStorage`.
2. **Editor.tsx** receives `doc` as a prop and pushes changes up via `onChange`. It exposes an `EditorRef` (`executeCommand`, `insertText`) for imperative formatting actions triggered by the sidebar.
3. **hybridPlugin.ts** is the "interactive" view's core: a CodeMirror `ViewPlugin` that walks the syntax tree on every update and replaces/decorates Markdown nodes (headers, lists, images, tables, HR) with widgets — but only when the cursor is **not** on the same line, keeping raw syntax visible for editing.
4. **ContextSidebar.tsx** reads the CodeMirror syntax node name at the cursor (passed up via `onContextChange`) and renders context-specific action buttons that call back into `EditorRef.executeCommand`.
5. **Rust (lib.rs)** handles file-open at launch (CLI args on Windows/Linux, `RunEvent::Opened` URLs on macOS) via a `LaunchState` mutex, and exposes `get_launch_file` as a Tauri command for the frontend to poll on startup.

### View Modes

| Mode | Description |
|---|---|
| `interactive` | Hybrid editor: CodeMirror + `hybridPlugin` decorations + `ContextSidebar` |
| `markdown` | Full rendered preview via `react-markdown` (`Preview` component) |
| `raw` | Plain CodeMirror editor, `hybridPlugin` disabled |

## Key Conventions

- **CodeMirror compartments** (`Compartment`) are used for all dynamic reconfiguration (theme, word wrap, `hybridPlugin`, `baseDirFacet`). Each compartment is created with `useMemo` so the same instance persists across re-renders; dynamic updates go through `viewRef.current.dispatch({ effects: compartment.reconfigure(...) })`.
- **`baseDirFacet`** is a CodeMirror `Facet` that provides the directory of the open file to the `hybridPlugin` so relative image paths can be resolved via Tauri's `convertFileSrc`.
- **Image resolution**: local images (relative or absolute paths) are converted to `asset://` URLs using `convertFileSrc` from `@tauri-apps/api/core`. Both `hybridPlugin` and `Preview` do this independently.
- **Custom titlebar**: `decorations: false` in `tauri.conf.json` disables the native window frame. Window dragging is handled manually in `App.tsx` via `appWindow.startDragging()`. Window controls are rendered differently for macOS vs. other platforms (detected via `navigator.userAgent.includes('Mac')`).
- **Theme system**: UI themes (menu bar, sidebar colors) are defined as a `THEMES` record in `App.tsx` using Tailwind class strings and hex colors. Editor themes are separate CodeMirror extensions (`oneDark`, `solarizedLight`, etc.) reconfigured via the theme compartment.
- **Tauri plugins used**: `tauri-plugin-fs` (file read/write), `tauri-plugin-dialog` (open/save dialogs), `tauri-plugin-opener` (external links). Asset protocol is enabled with `scope: ["**/*"]` for local image display.
