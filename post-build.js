/**
 * After building the project:
 * 1. Insert the renderer script into the HTML file
 * 2. Embed the HTML content into ProgressWindow.js
 * 3. Clean up intermediate files (renderer.js only - preload.js stays)
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

const distDir = path.resolve(__dirname, 'dist')
// the original html file in the src folder
const origHtmlFilePath = path.resolve(
  __dirname,
  'src/ProgressWindow/index.html'
)

// path to dist subfolders
const cjsPath = path.resolve(distDir, 'cjs')
const esmPath = path.resolve(distDir, 'esm')

// Renderer script paths
const rendererJsPathCjs = path.resolve(cjsPath, 'ProgressWindow/renderer.js')
const rendererJsDefinitionsPathCjs = path.resolve(
  cjsPath,
  'ProgressWindow/renderer.d.ts'
)
const rendererJsPathEsm = path.resolve(esmPath, 'ProgressWindow/renderer.js')
const rendererJsDefinitionsPathEsm = path.resolve(
  esmPath,
  'ProgressWindow/renderer.d.ts'
)

// Read the renderer script (use ESM version for both)
const rendererJSEsmContent = fs.readFileSync(rendererJsPathEsm, 'utf-8')

// Insert renderer script into HTML
const htmlContent = fs.readFileSync(origHtmlFilePath, 'utf-8')
const htmlContentWithScript = htmlContent.replace(
  '</body>',
  `
  <script type="module">
    ${rendererJSEsmContent}
  </script>
  </body>`
)

// ProgressWindow.js paths
const cjsScriptPath = path.resolve(cjsPath, 'ProgressWindow/ProgressWindow.js')
const esmScriptPath = path.resolve(esmPath, 'ProgressWindow/ProgressWindow.js')

function escapeForTemplate(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
}

let cjsScriptContent = fs.readFileSync(cjsScriptPath, 'utf-8')
let esmScriptContent = fs.readFileSync(esmScriptPath, 'utf-8')

// Replace the htmlContent fs.readFileSync with the embedded content
const htmlRegex = /const htmlContent = [^;]+;/
cjsScriptContent = cjsScriptContent.replace(
  htmlRegex,
  `const htmlContent = \`${escapeForTemplate(htmlContentWithScript)}\`;`
)
esmScriptContent = esmScriptContent.replace(
  htmlRegex,
  `const htmlContent = \`${escapeForTemplate(htmlContentWithScript)}\`;`
)

// Write the modified ProgressWindow.js files
fs.writeFileSync(cjsScriptPath, cjsScriptContent)
fs.writeFileSync(esmScriptPath, esmScriptContent)

// Helper function to safely unlink files
function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (e) {
    console.warn(`Warning: Could not delete ${filePath}: ${e.message}`)
  }
}

// Remove the renderer.js files (no longer needed, embedded in HTML)
safeUnlink(rendererJsPathCjs)
safeUnlink(rendererJsPathCjs + '.map')
safeUnlink(rendererJsDefinitionsPathCjs)
safeUnlink(rendererJsDefinitionsPathCjs + '.map')
safeUnlink(rendererJsPathEsm)
safeUnlink(rendererJsPathEsm + '.map')
safeUnlink(rendererJsDefinitionsPathEsm)
safeUnlink(rendererJsDefinitionsPathEsm + '.map')

console.log('Post-build: Embedded renderer script and HTML successfully.')
