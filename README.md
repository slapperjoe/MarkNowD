# MarkNowD

MarkNowD is a modern, feature-rich Markdown editor built with Tauri, React, and TypeScript. It offers a distraction-free writing environment with a sleek, customizable interface.

## Features

- **Cross-Platform**: Built with Tauri for a lightweight, native performance on Windows, macOS, and Linux.
- **Multiple Themes**: Choose from Dark, Light, Solarized Light, and Solarized Dark themes to suit your preference.
- **View Modes**:
  - **Interactive**: Split view with the editor and a context-aware sidebar.
  - **Markdown**: Full-width preview mode to see your rendered document.
  - **Raw**: Distraction-free code-only view.
- **File Operations**: Seamlessly create, open, save, and manage your Markdown files.
- **Real-time Preview**: See your changes instantly as you type.
- **Custom UI**: A completely custom titlebar and window controls for a unified verification.

## Tech Stack

- **Core**: [Tauri](https://tauri.app/) v2 (Rust + Webview)
- **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Editor**: [CodeMirror](https://codemirror.net/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Development

### Prerequisites

- Node.js (v18 or later)
- Rust (latest stable) & Cargo (for Tauri)

### Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Run Locally

Start the development server with hot-reload:
```bash
npm run tauri dev
```

### Build

Build the application for production:
```bash
npm run tauri build
```
