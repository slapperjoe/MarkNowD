# Project Context: MarkNowD

## Overview
**MarkNowD** is a Markdown editor application built using Tauri v2, React 19, and Vite. It aims to provide a fast and efficient writing experience.

## Technology Stack

### Frontend
- **Framework**: React 19 (Hooks, Functional Components)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Editor Component**: CodeMirror 6 (`@codemirror/*`, `@uiw/codemirror-theme-solarized`)

### Backend / Core
- **Framework**: Tauri v2 (Rust)
- **Configuration**: `src-tauri/tauri.conf.json`

## Directory Structure

- `src/`: Contains the React frontend source code.
    - `App.tsx`: Main application component.
    - `main.tsx`: Entry point for React.
- `src-tauri/`: Contains the Rust backend code and Tauri configuration.
    - `tauri.conf.json`: Main Tauri configuration file.
- `public/`: Static assets.

## Key Configuration Files
- `package.json`: NPM dependencies and scripts.
- `src-tauri/tauri.conf.json`: Application window configuration, permissions, and bundle settings.
- `vite.config.ts`: Vite build configuration.
- `tsconfig.json`: TypeScript configuration.

## Development Commands

- `npm run dev`: Start the frontend development server (Vite).
- `npm run tauri dev`: Start the application in a Tauri window (simulating the desktop app).
- `npm run build`: Build the frontend and backend for production.

## Getting Started for Agents

### Prerequisites
- **Node.js**: Required for the frontend environment.
- **Rust**: Required for Tauri. Ensure `rustc` and `cargo` are available (typically via `rustup`).

### Setup
1.  **Install Dependencies**:
    ```bash
    npm install
    ```

### Running the Application
-   **Browser Mode (Frontend Only)**:
    Use this for quick UI iteration without Tauri APIs.
    ```bash
    npm run dev
    ```
-   **Desktop Mode (Tauri)**:
    Use this to test the full application with backend integration.
    ```bash
    npm run tauri dev
    ```

### Troubleshooting
-   **WebView2**: On Windows, ensure the WebView2 runtime is installed if the app fails to launch.
-   **Build Errors**: If Rust compilation fails, try `cargo clean` in `src-tauri/` or check `rustc --version`.
