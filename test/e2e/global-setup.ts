import { execSync } from 'child_process'
import * as path from 'path'

/**
 * Global setup runs once before all workers start
 * This ensures the library and playground are built before any tests run
 *
 * Set EPW_BUNDLED=1 to build the playground's main process with esbuild
 * instead of plain tsc. That inlines this library into a single file, the
 * way a consuming app packed with webpack/vite/forge would, so the whole
 * suite then runs against a bundled copy rather than one loaded out of
 * node_modules. post-build.js already guarantees the built library reads no
 * assets off disk; this is what exercises that at runtime.
 */
export default function globalSetup() {
  const rootDir = path.join(__dirname, '../..')
  const playgroundPath = path.join(rootDir, 'examples/playground')
  const bundled = process.env.EPW_BUNDLED === '1'

  console.log('Building main library...')
  execSync('npm run build', {
    cwd: rootDir,
    stdio: 'inherit',
  })

  console.log('Installing playground dependencies...')
  execSync('npm install', {
    cwd: playgroundPath,
    stdio: 'inherit',
  })

  console.log(`Building playground${bundled ? ' (bundled)' : ''}...`)
  execSync(bundled ? 'npm run build:bundled' : 'npm run build', {
    cwd: playgroundPath,
    stdio: 'inherit',
  })

  console.log('Global setup complete!')
}
