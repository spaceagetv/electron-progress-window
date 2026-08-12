/**
 * After building the project:
 * 1. Insert the renderer script into the HTML file
 * 2. Embed the HTML content into ProgressWindow.js
 * 3. Embed the preload script content into ProgressWindow.js
 * 4. Clean up intermediate files
 */

const fs = require('fs')

const path = require('path')

const { execFileSync } = require('child_process')

const distDir = path.resolve(__dirname, 'dist')
// the original html file in the src folder
const origHtmlFilePath = path.resolve(
  __dirname,
  'src/ProgressWindow/index.html',
)

// path to dist subfolders
const cjsPath = path.resolve(distDir, 'cjs')
const esmPath = path.resolve(distDir, 'esm')

// Renderer script paths
const rendererJsPathCjs = path.resolve(cjsPath, 'ProgressWindow/renderer.js')
const rendererJsDefinitionsPathCjs = path.resolve(
  cjsPath,
  'ProgressWindow/renderer.d.ts',
)
const rendererJsPathEsm = path.resolve(esmPath, 'ProgressWindow/renderer.js')
const rendererJsDefinitionsPathEsm = path.resolve(
  esmPath,
  'ProgressWindow/renderer.d.ts',
)

// Preload script paths
const preloadJsPathCjs = path.resolve(cjsPath, 'ProgressWindow/preload.js')
const preloadJsPathEsm = path.resolve(esmPath, 'ProgressWindow/preload.js')

// Read the renderer script (use ESM version for both)
const rendererJSEsmContent = fs.readFileSync(rendererJsPathEsm, 'utf-8')

// The renderer is inlined into an HTML <script> block below. A literal
// "</script" anywhere in it — even inside a string — closes that block early,
// which the HTML parser accepts silently and which produces a page that half
// works. Nothing downstream would catch it, so refuse to build.
if (/<\/script/i.test(rendererJSEsmContent)) {
  throw new Error(
    'post-build: the compiled renderer contains a literal "</script", which ' +
      'would terminate the inline <script> block early. Split the string ' +
      '(e.g. "<\\/scr" + "ipt") in src/ProgressWindow/renderer.ts.',
  )
}

// Read the preload script (use CJS version since it runs in Node context)
const preloadJsContent = fs.readFileSync(preloadJsPathCjs, 'utf-8')

// Insert renderer script into HTML.
// Routed through replaceOnceOrFail (hoisted below) for the same reasons the
// dist substitutions are: a string-form String.replace would interpret `$&`,
// `$'` and friends inside the renderer source as replacement patterns, and a
// zero-match (a renamed or reformatted </body>) would silently produce a page
// with no renderer script at all.
const htmlContent = fs.readFileSync(origHtmlFilePath, 'utf-8')
const htmlContentWithScript = replaceOnceOrFail(
  htmlContent,
  /<\/body>/,
  `
  <script type="module">
    ${rendererJSEsmContent}
  </script>
  </body>`,
  'the closing </body> tag',
  origHtmlFilePath,
)

// ProgressWindow.js paths
const cjsScriptPath = path.resolve(cjsPath, 'ProgressWindow/ProgressWindow.js')
const esmScriptPath = path.resolve(esmPath, 'ProgressWindow/ProgressWindow.js')

/**
 * Escape a string for safe embedding in a JavaScript template literal.
 * Handles backslashes, backticks, and template placeholder sequences (dollar-brace).
 */
function escapeForTemplate(str) {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$') // Escape $ to prevent ${...} template placeholders
}

/**
 * Regex-replace exactly once, or abort the build.
 *
 * These patterns match tsc's emitted JavaScript, whose shape depends on the
 * `target` / `module` settings. A silent non-match would ship a package that
 * calls fs.readFileSync on files that were deleted below, so a miss must be a
 * build failure rather than a warning.
 */
function replaceOnceOrFail(source, regex, replacement, what, where) {
  const matches = source.match(
    new RegExp(
      regex.source,
      regex.flags.includes('g') ? regex.flags : regex.flags + 'g',
    ),
  )
  if (!matches || matches.length !== 1) {
    throw new Error(
      `post-build: expected exactly 1 match for ${what} in ${where}, found ${matches ? matches.length : 0}.\n` +
        `Pattern: ${regex}\n` +
        `The tsc target/module settings likely changed the emitted JS shape. ` +
        `Fix the pattern (or the source) — shipping without this substitution ` +
        `produces a broken package.`,
    )
  }
  // Use a function replacer so `$&`, `$1` etc. in the embedded asset text are
  // treated as literal characters rather than replacement patterns.
  return source.replace(regex, () => replacement)
}

let cjsScriptContent = fs.readFileSync(cjsScriptPath, 'utf-8')
let esmScriptContent = fs.readFileSync(esmScriptPath, 'utf-8')

// Replace the htmlContent fs.readFileSync with the embedded content
// Anchored to the start of a line so that prose mentioning the assignment
// (in a comment, for example) cannot be matched instead of the statement.
const htmlRegex = /^[ \t]*const htmlContent = [^;]+;/m
const embeddedHtmlStatement = `const htmlContent = \`${escapeForTemplate(htmlContentWithScript)}\`;`
cjsScriptContent = replaceOnceOrFail(
  cjsScriptContent,
  htmlRegex,
  embeddedHtmlStatement,
  'the htmlContent assignment',
  cjsScriptPath,
)
esmScriptContent = replaceOnceOrFail(
  esmScriptContent,
  htmlRegex,
  embeddedHtmlStatement,
  'the htmlContent assignment',
  esmScriptPath,
)

// Replace the getPreloadContent function to return embedded content
const preloadFunctionRegex =
  /function getPreloadContent\(\)[^{]*\{[\s\S]*?return preloadContent;\s*\}/
const embeddedPreloadFunction = `function getPreloadContent() {
  if (!preloadContent) {
    preloadContent = \`${escapeForTemplate(preloadJsContent)}\`;
  }
  return preloadContent;
}`
cjsScriptContent = replaceOnceOrFail(
  cjsScriptContent,
  preloadFunctionRegex,
  embeddedPreloadFunction,
  'the getPreloadContent() body',
  cjsScriptPath,
)
esmScriptContent = replaceOnceOrFail(
  esmScriptContent,
  preloadFunctionRegex,
  embeddedPreloadFunction,
  'the getPreloadContent() body',
  esmScriptPath,
)

// Belt-and-braces: neither build may still read these assets off disk, since
// index.html is never emitted and preload.js is deleted a few lines below.
for (const [label, content] of [
  ['dist/cjs', cjsScriptContent],
  ['dist/esm', esmScriptContent],
]) {
  for (const leftover of [
    "'index.html'",
    "'preload.js'",
    '"index.html"',
    '"preload.js"',
  ]) {
    if (content.includes(`__dirname, ${leftover}`)) {
      throw new Error(
        `post-build: ${label}/ProgressWindow.js still resolves ${leftover} at runtime after inlining.`,
      )
    }
  }
}

// Write the modified ProgressWindow.js files
fs.writeFileSync(cjsScriptPath, cjsScriptContent)
fs.writeFileSync(esmScriptPath, esmScriptContent)

// Pin the module format of each build output. Without dist/esm/package.json,
// Node reads the root package.json (which has no "type") and parses
// dist/esm/*.js as CommonJS -> "SyntaxError: Unexpected token 'export'".
fs.writeFileSync(
  path.resolve(cjsPath, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2) + '\n',
)
fs.writeFileSync(
  path.resolve(esmPath, 'package.json'),
  JSON.stringify({ type: 'module' }, null, 2) + '\n',
)

// Verify the artifacts we just wrote are actually loadable and actually carry
// the inlined assets. Nothing else in the repo loads dist/esm — the unit tests
// run against src/ and the E2E playground consumes dist/cjs — so without this
// a malformed ESM build would reach npm with a fully green CI.
for (const [label, dir] of [
  ['dist/cjs', cjsPath],
  ['dist/esm', esmPath],
]) {
  for (const entry of ['index.js', 'ProgressWindow/ProgressWindow.js']) {
    const file = path.resolve(dir, entry)
    // `node --check` honours the {"type"} marker written above, so this is a
    // real per-format parse: it is what catches "export outside a module" in
    // dist/esm, and any syntax damage from the template-literal escaping.
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    } catch (e) {
      throw new Error(
        `post-build: ${label}/${entry} does not parse as ${
          label === 'dist/esm' ? 'ESM' : 'CommonJS'
        }.\n${e.stderr ? e.stderr.toString() : e.message}`,
        { cause: e },
      )
    }
  }

  const built = fs.readFileSync(
    path.resolve(dir, 'ProgressWindow/ProgressWindow.js'),
    'utf-8',
  )
  // The renderer reaches the window only by being inlined into the HTML that
  // gets inlined here. If the </body> substitution ever no-ops, the window
  // opens and renders nothing, with no error anywhere.
  for (const sentinel of ['<script type="module">', 'progressWindowAPI']) {
    if (!built.includes(sentinel)) {
      throw new Error(
        `post-build: ${label}/ProgressWindow.js is missing ${JSON.stringify(
          sentinel,
        )} — the renderer or preload was not inlined.`,
      )
    }
  }
}

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

// Remove the preload.js files (no longer needed, content embedded in ProgressWindow.js)
// Keep preload.d.ts files since ProgressWindowAPI type is exported from index.ts
safeUnlink(preloadJsPathCjs)
safeUnlink(preloadJsPathCjs + '.map')
safeUnlink(preloadJsPathEsm)
safeUnlink(preloadJsPathEsm + '.map')

/**
 * Every relative specifier in the emitted JS must resolve to a file that
 * actually exists in dist.
 *
 * This exists because nothing else catches a missing `.js` extension. Node's
 * ESM loader requires the extension, but `moduleResolution: "bundler"` — which
 * the ESM build needs, since `nodenext` without a root `"type": "module"` would
 * emit `require()` — is specifically designed to allow extensionless
 * specifiers. So dropping one `.js` in src/ passes type-check, build, lint and
 * every test, and only fails with ERR_MODULE_NOT_FOUND in a consumer's app.
 * That is exactly how the previously-published broken dist/esm got out.
 *
 * Runs after the unlinks so it checks the tree that actually ships.
 */
function checkSpecifiersResolve(label, dir) {
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) return walk(full)
      return entry.isFile() && entry.name.endsWith('.js') ? [full] : []
    })

  for (const file of walk(dir)) {
    const source = fs.readFileSync(file, 'utf-8')
    const specifiers = [
      // import/export ... from './x'
      ...source.matchAll(/\bfrom\s+['"](\.[^'"]*)['"]/g),
      // import('./x')  |  require('./x')
      ...source.matchAll(
        /\b(?:import|require)\s*\(\s*['"](\.[^'"]*)['"]\s*\)/g,
      ),
      // import './x' — a side-effect import has no `from` and no parens, so
      // neither pattern above sees it. src/ has none today; the guard exists
      // for the change that adds one.
      ...source.matchAll(/\bimport\s+['"](\.[^'"]*)['"]/g),
    ].map((m) => m[1])

    for (const specifier of specifiers) {
      const target = path.resolve(path.dirname(file), specifier)
      // A bare directory specifier only works under CommonJS resolution.
      const ok = label.endsWith('esm')
        ? fs.existsSync(target) && fs.statSync(target).isFile()
        : fs.existsSync(target) ||
          fs.existsSync(target + '.js') ||
          fs.existsSync(path.join(target, 'index.js'))
      if (!ok) {
        throw new Error(
          `post-build: ${label}/${path.relative(dir, file)} imports ` +
            `'${specifier}', which does not resolve to a file in dist.\n` +
            `Relative imports in src/ must carry an explicit .js extension — ` +
            `moduleResolution "bundler" will not flag a missing one, but Node ` +
            `will fail to load the package at runtime.`,
        )
      }
    }
  }
}

checkSpecifiersResolve('dist/cjs', cjsPath)
checkSpecifiersResolve('dist/esm', esmPath)

console.log('Post-build: Embedded renderer and preload scripts successfully.')
