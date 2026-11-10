import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import fs from 'node:fs';
import path from 'node:path';

function loadCssVariables() {
  const cssPath = path.resolve('./src/styles/global.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const rootMatch = cssContent.match(/:root\s*\{([\s\S]*?)\}/);
  const vars = {};
  if (rootMatch) {
    const declRegex = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = declRegex.exec(rootMatch[1])) !== null) {
      vars[match[1].trim()] = match[2].trim();
    }
  }
  return vars;
}

function resolveCssVarsPlugin() {
  let vars = loadCssVariables();
  return {
    name: 'resolve-css-vars',
    buildStart() {
      vars = loadCssVariables();
    },
    handleHotUpdate({ file }) {
      if (file.endsWith('global.css')) {
        vars = loadCssVariables();
      }
    },
    transform(code, id) {
      if (!code.includes('var(--')) return null;
      if (id.includes('node_modules')) return null;
      const replaced = code.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g, (full, varName) => {
        return vars[varName] !== undefined ? vars[varName] : full;
      });
      return { code: replaced, map: null };
    }
  };
}

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    plugins: [resolveCssVarsPlugin()]
  }
});
