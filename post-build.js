/**
 * After building the project, copy html file to the dist folder,
 * and insert the renderer script into the html file.
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

const rendererJSEsmContent = fs.readFileSync(rendererJsPathEsm, 'utf-8')

// insert esm script into both html files
const htmlContent = fs.readFileSync(origHtmlFilePath, 'utf-8')

const htmlContentWithScript = htmlContent.replace(
  '</body>',
  `
  <script type="module">
    ${rendererJSEsmContent}
  </script>
  </body>`
)

const cjsScriptPath = path.resolve(cjsPath, 'ProgressWindow/ProgressWindow.js')
const esmScriptPath = path.resolve(esmPath, 'ProgressWindow/ProgressWindow.js')

function escapeHtml(html) {
  return html
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
}

const cjsScriptContent = fs.readFileSync(cjsScriptPath, 'utf-8')
const esmScriptContent = fs.readFileSync(esmScriptPath, 'utf-8')

// find the line that start with `const htmlContent = ` and replace everything after it until `;`
// example: const htmlContent = fs.readFileSync(htmlPath, 'utf8');
// should become: const htmlContent = `<!DOCTYPE html> ...`;
const regex = /const htmlContent = [^;]+;/

// test it
// console.log('cjs matching?', regex.test(cjsScriptContent))
// console.log('esm matching?', regex.test(esmScriptContent))

const cjsScriptContentWithRenderer = cjsScriptContent.replace(
  regex,
  `const htmlContent = \`${escapeHtml(htmlContentWithScript)}\`;`
)
const esmScriptContentWithRenderer = esmScriptContent.replace(
  regex,
  `const htmlContent = \`${escapeHtml(htmlContentWithScript)}\`;`
)

// console.log('cjsScriptContentWithRenderer', cjsScriptContentWithRenderer)
// console.log('esmScriptContentWithRenderer', esmScriptContentWithRenderer)

fs.writeFileSync(cjsScriptPath, cjsScriptContentWithRenderer)
fs.writeFileSync(esmScriptPath, esmScriptContentWithRenderer)

// remove the renderer.js files
fs.unlinkSync(rendererJsPathCjs)
fs.unlinkSync(rendererJsPathCjs + '.map')
fs.unlinkSync(rendererJsDefinitionsPathCjs)
fs.unlinkSync(rendererJsDefinitionsPathCjs + '.map')

fs.unlinkSync(rendererJsPathEsm)
fs.unlinkSync(rendererJsPathEsm + '.map')
fs.unlinkSync(rendererJsDefinitionsPathEsm)
fs.unlinkSync(rendererJsDefinitionsPathEsm + '.map')
