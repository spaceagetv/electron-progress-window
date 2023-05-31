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

// the path where the html files will be copied to
const cjsHtmlPath = path.resolve(cjsPath, 'ProgressWindow/index.html')
const esmHtmlPath = path.resolve(esmPath, 'ProgressWindow/index.html')

const rendererJsPathEsm = path.resolve(esmPath, 'ProgressWindow/renderer.js')
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

fs.writeFileSync(cjsHtmlPath, htmlContentWithScript)
fs.writeFileSync(esmHtmlPath, htmlContentWithScript)
