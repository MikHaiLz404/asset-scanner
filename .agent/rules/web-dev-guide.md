---
trigger: always_on
---

# Web Development Guidelines

## 1. Naming Convention
- **React Components:** Use **PascalCase** (e.g., `App.jsx`, `NavBar.jsx`, `AssetViewer.jsx`).
- **Other Files & Directories:** Use **kebab-case** (lowercase with hyphens) (e.g., `utils.js`, `global-styles.css`, `assets/images`).
- **Language:** Use English only.

## 2. Git Ignore
- Create and strictly maintain a `.gitignore` file.
- Exclude unnecessary files (e.g., `node_modules`, `dist`, `.env`) from the repository.

## 3. Separation of Concerns
- **HTML (Structure):** Use semantic HTML elements.
- **CSS (Styling):** Keep styling in separate `.css` files or modules. Avoid inline styles.
- **JS (Functionality):** Keep logic in JavaScript/JSX files.

## 4. Responsive Design
- Ensure CSS supports both mobile and desktop viewports.
- Use media queries or flexible layouts (Flexbox/Grid).

## 5. Environment Setup
- Install all necessary development tools and dependencies.
- Ensure `package.json` is up to date.

## 6. Verify Output
- Always launch the web page to verify results after every update.

## 7. Error Handling
- **Async Operations:** Always use `try-catch` blocks for asynchronous operations (e.g., File System API calls).
- **User Feedback:** Provide clear visual feedback (toasts, alerts, or error states) when errors occur. Do not fail silently.

## 8. Performance Optimization
- **Memoization:** Use `useMemo` and `useCallback` to prevent unnecessary re-renders, especially for expensive calculations or list items.
- **Lazy Loading:** Use `React.lazy` and `Suspense` for large components or heavy assets to improve initial load time.

## 9. Code Quality
- **Clean Code:** Remove unnecessary `console.log` statements before committing. Use a proper logging system if needed.
- **Single Responsibility:** Keep components small and focused. Extract complex logic into custom hooks or helper functions.

## 10. Modularization
- **Feature Modules:** Break down large features into smaller, self-contained sub-modules or components.
- **Avoid Bloat:** Prevent files from becoming too large (e.g., > 300 lines). Refactor and split code when it grows beyond a manageable size.
