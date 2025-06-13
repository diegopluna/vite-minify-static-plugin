import { transformSync } from "esbuild"
import { glob } from "fast-glob"
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, extname, join } from "node:path"
import { Plugin } from "vite"

export interface MinifyStaticOptions {
  /**
   * Source directory containing static files
   * @default 'public' for most frameworks, 'static' for SvelteKit
   */
  sourceDir?: string

  /**
   * Files to minify (glob patterns relative to sourceDir)
   * @default ['**\/*.js', '**\/*.mjs']
   */
  files?: string[]

  /**
   * ESBuild transform MinifyStaticOptions
   */
  esBuildOptions?: {
    target?: string
    minify?: boolean
    format?: 'iife' | 'cjs' | 'esm'
    loader?: 'js' | 'ts' | 'jsx' | 'tsx';
  }

  /**
   * Enable verbose logging
   * @default false 
   */
  verbose?: boolean

  /**
   * Custom output directory (relative to build output)
   * Leave undefined to use the same relative path as source
   */
  outputDir?: string

  /**
   * Framework specific settings
   */
  framework?: 'sveltekit' | 'react' | 'vue' | 'vanilla' | 'auto'
}

const defaultOptions: Required<Omit<MinifyStaticOptions, 'outputDir'>> & { outputDir?: string } = {
  sourceDir: 'public', // Will be auto-detected
  files: ['**/*.js', '**/*.mjs'],
  esBuildOptions: {
    target: 'es2020',
    minify: true,
    format: 'iife',
    loader: 'js'
  },
  verbose: false,
  framework: 'auto',
  outputDir: undefined
}

function detectFramework(): 'sveltekit' | 'react' | 'vue' | 'vanilla' {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (deps['@sveltejs/kit']) return 'sveltekit'
    if (deps['react'] || deps['@vitejs/plugin-react']) return 'react'
    if (deps['vue'] || deps['@vitejs/plugin-vue']) return 'vue'

    return 'vanilla'
  } catch {
    return 'vanilla'
  }
}


function getDefaultSourceDir(framework: string) {
  switch (framework) {
    case 'sveltekit':
      return 'static'
    case 'react':
    case 'vue':
    case 'vanilla':
    default:
      return 'public'
  }
}

function shouldProcessBundle(bundleOptions: any, framework: string): boolean {
  const dir = bundleOptions.dir || ''

  switch (framework) {
    case 'sveltekit':
      // Only process client bundle for sveltekit
      return dir.includes('client')
    case 'react':
    case 'vue':
    case 'vanilla':
    default:
      //For other frameworks, process if it's the main build output
      return !dir.includes('server') && !dir.includes('ssr')
  }
}

export function minifyStatic(userOptions: MinifyStaticOptions = {}): Plugin {
  const detectedFramework = userOptions.framework === 'auto' ? detectFramework() : userOptions.framework || 'vanilla'

  const options = {
    ...defaultOptions,
    sourceDir: userOptions.sourceDir || getDefaultSourceDir(detectedFramework),
    ...userOptions,
    framework: detectedFramework
  }

  return {
    name: 'vite-minify-static-plugin',
    apply: 'build',

    writeBundle(bundleOptions) {
      if (!shouldProcessBundle(bundleOptions, options.framework)) {
        if (options.verbose) {
          console.log(`⏭️  Skipping bundle: ${bundleOptions.dir} (${options.framework})`)
        }
        return
      }

      const sourceDir = join(process.cwd(), options.sourceDir)
      const outputDir = bundleOptions.dir

      if (!outputDir) {
        console.warn('⚠️  No output directory found, skipping minification')
        return
      }

      if (options.verbose) {
        console.log(`🔍 Looking for static files in ${options.sourceDir}/ (${options.framework})`);
      }

      try {
        // Find files using glob patterns
        const filesToMinify = glob.sync(options.files, {
          cwd: sourceDir,
          onlyFiles: true
        })

        if (filesToMinify.length === 0) {
          if (options.verbose) {
            console.log('📝 No static files found to minify')
          }
          return
        }

        let minifiedCount = 0
        let totalSavings = 0

        for (const file of filesToMinify) {
          const sourcePath = join(sourceDir, file)
          const outputPath = options.outputDir
            ? join(outputDir, options.outputDir, file)
            : join(outputDir, file)

          try {
            if (!existsSync(sourcePath)) {
              if (options.verbose) {
                console.warn(`⚠️  Source file not found: ${sourcePath}`);
              }
              continue
            }

            const code = readFileSync(sourcePath, 'utf-8')

            //Determine loader based on file extensions
            const ext = extname(file).toLowerCase()
            let loader = options.esBuildOptions.loader || 'js'

            if (ext === '.ts') loader = 'ts'
            else if (ext === '.jsx') loader = 'jsx'
            else if (ext === '.tsx') loader = 'tsx'

            const result = transformSync(code, {
              ...options.esBuildOptions,
              loader
            })

            //Ensure output directory exists
            const outputDirPath = dirname(outputPath)

            if (!existsSync(outputDirPath)) {
              require('fs').mkDirSync(outputDirPath, { recursive: true })
            }

            // Delete original if it exists and write minified version
            if (existsSync(outputPath)) {
              unlinkSync(outputDirPath)
            }

            writeFileSync(outputPath, result.code)
            minifiedCount++

            if (options.verbose) {
              const originalSize = Buffer.byteLength(code, 'utf-8')
              const minifiedSize = Buffer.byteLength(result.code, 'utf-8')
              const savings = originalSize - minifiedSize
              const savingsPercent = ((savings / originalSize) * 100).toFixed(1)

              totalSavings += savings

              console.log(`✅ ${file}: ${originalSize}B → ${minifiedSize}B (-${savingsPercent}%)`);
            }
          } catch (error) {
            console.error(`❌ Error minifying ${file}:`, error);
          }
        }

        if (minifiedCount > 0) {
          const message = `🎉 Minified ${minifiedCount} static file${minifiedCount !== 1 ? 's' : ''}`;
          const savingsMessage = options.verbose && totalSavings > 0
            ? ` (saved ${(totalSavings / 1024).toFixed(1)}KB total)`
            : ''
          console.log(message + savingsMessage);
        }
      } catch (error) {
        console.error('❌ Error in vite-minify-static-plugin:', error);
      }
    }
  }
}

export default minifyStatic

