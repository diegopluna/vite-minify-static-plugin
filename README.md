# vite-plugin-minify-static

A universal Vite plugin that automatically minifies static files during build. Works with SvelteKit, React, Vue, and any Vite-based project.

## Installation

```bash
npm install -D vite-minify-static-plugin
```

## Usage

### SvelteKit

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { minifyStatic } from 'vite-minify-static-plugin';

export default defineConfig({
  plugins: [
    sveltekit(),
    minifyStatic(), // Auto-detects SvelteKit, uses 'static' folder
  ],
});
```

### React

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { minifyStatic } from 'vite-minify-static-plugin';

export default defineConfig({
  plugins: [
    react(),
    minifyStatic(), // Auto-detects React, uses 'public' folder
  ],
});
```

### Vue

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { minifyStatic } from 'vite-minify-static-plugin';

export default defineConfig({
  plugins: [
    vue(),
    minifyStatic(), // Auto-detects Vue, uses 'public' folder
  ],
});
```

### Custom Configuration

```typescript
import { minifyStatic } from 'vite-minify-static-plugin';

export default defineConfig({
  plugins: [
    minifyStatic({
      sourceDir: 'assets', // Custom source directory
      files: ['**/*.js', '**/*.ts', 'widgets/*.mjs'], // Custom file patterns
      framework: 'react', // Override auto-detection
      verbose: true, // Enable detailed logging
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sourceDir` | `string` | Auto-detected | Source directory (`static` for SvelteKit, `public` for others) |
| `files` | `string[]` | `['**/*.js', '**/*.mjs']` | Glob patterns for files to minify |
| `framework` | `string` | `'auto'` | Framework type or auto-detect |
| `verbose` | `boolean` | `false` | Enable detailed logging |
| `terserOptions` | `object` | See below | Terser minify options |
| `outputDir` | `string` | `undefined` | Custom output directory |

### Default Terser Options

```typescript
{
  compress: true,
  mangle: true,
  format: {
    comments: false,
  },
}
```

## Framework Support

- ✅ **SvelteKit**: Auto-detects, processes client bundle only
- ✅ **React**: Auto-detects, processes main build output
- ✅ **Vue**: Auto-detects, processes main build output  
- ✅ **Vanilla**: Default fallback for any Vite project

## License

MIT
