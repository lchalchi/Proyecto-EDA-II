# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Publicar en GitHub Pages

GitHub Actions compila y publica esta app al actualizar `main` o `master`.

1. En GitHub, abre **Settings → Pages** del repositorio.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Integra los cambios en `main` (o `master`) y revisa la ejecución de
   **Publicar app React en GitHub Pages** en la pestaña **Actions**.

La URL será `https://unam-fi-edaii-2026-1.github.io/eda-2-lchalchi/`. La ruta
base `/eda-2-lchalchi/` está configurada en `vite.config.js`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
