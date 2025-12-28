import { execSync } from 'child_process'
import * as path from 'path'

/**
 * Global setup runs once before all workers start
 * This ensures the library and playground are built before any tests run
 */
export default function globalSetup() {
  const rootDir = path.join(__dirname, '../..')
  const playgroundPath = path.join(rootDir, 'examples/playground')

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

  console.log('Building playground...')
  execSync('npm run build', {
    cwd: playgroundPath,
    stdio: 'inherit',
  })

  console.log('Global setup complete!')
}
