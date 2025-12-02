# Asset Scanner 📦

A powerful, local-first web application for scanning, viewing, and organizing your digital assets directly from your browser. No uploads, no cloud storage—everything stays on your machine.

## ✨ Features

- **📂 Recursive Scanning**: Select a folder and instantly see all supported assets nested within it.
- **🖼️ Universal Viewer**:
  - **3D Models**: Interactive viewer for FBX, OBJ, GLTF, GLB, Blend, Maya files. (Supports rotation, zoom, pan).
  - **Media**: Native support for Images, Audio, and Video files.
- **🏷️ Custom Tags**: Add your own tags to files for easy filtering.
- **nav Folder Navigation**:
  - **Tree View**: Expandable sidebar to browse your folder hierarchy.
  - **Breadcrumbs**: Quick navigation through parent directories.
  - **Resizable Sidebar**: Adjust the layout to your preference.
- **🔍 Search & Filter**:
  - Global search across all folders.
  - Filter by type (Model, Image, Audio, Video).
  - Filter by your custom tags.
- **⭐ Bookmarks & Recent**: Quickly access your frequently used project folders.
- **🔒 Privacy First**: Uses the File System Access API. Your files never leave your computer.

## 🛠️ Tech Stack

- **Framework**: React + Vite
- **3D Engine**: Three.js / React Three Fiber / Drei
- **Storage**: IndexedDB (for bookmarks and tags)
- **Styling**: CSS Modules / Vanilla CSS

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/asset-scanner.git
    cd asset-scanner
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run locally**
    ```bash
    npm run dev
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## 🌐 Deployment (GitHub Pages)

This project is configured for GitHub Pages.

1.  Ensure `vite.config.js` has the correct base URL:
    ```js
    base: '/asset-scanner/',
    ```
2.  Push your code to GitHub.
3.  Configure GitHub Pages in your repo settings to deploy from the `gh-pages` branch (or use a GitHub Action).

## 📄 License

MIT
