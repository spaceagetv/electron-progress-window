import fs from 'fs'
import path from 'path'

/**
 * Media types for the file extensions a progress window stylesheet is likely
 * to reference. Anything else needs an explicit `mediaType` argument.
 * @internal
 */
const MEDIA_TYPES: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

/**
 * Read a file and return it as a base64 `data:` URI, for use inside the `css`
 * option of a ProgressWindow.
 *
 * @remarks
 *
 * The progress page is loaded from a `data:` URL, which has an opaque origin.
 * Combined with the window's `sandbox` and `webSecurity` settings, that means
 * the page cannot fetch subresources of any kind — not `file://`, not a
 * relative path, not a custom protocol registered by the host app. Every URL
 * in consumer-supplied CSS is dead on arrival.
 *
 * Inlining the asset is the way around that. This helper exists so each
 * consumer does not have to rediscover the requirement and write their own
 * base64 step.
 *
 * Assets are embedded in the page URL, so keep an eye on total size — a
 * variable font is roughly 75 KB of base64 before `encodeURIComponent`
 * expands `+`, `/` and `=`. Subsetting a font to the characters you actually
 * use makes a large difference.
 *
 * @param filePath - Path to the file to inline. Resolved relative to the
 * current working directory if not absolute, so prefer absolute paths built
 * from `__dirname` or `app.getAppPath()`.
 * @param mediaType - Media type to declare. Inferred from the file extension
 * when omitted; required for extensions this helper does not know.
 * @returns A `data:` URI suitable for use in a CSS `url()`
 * @throws If the file cannot be read, or the media type is neither given nor
 * inferable from the extension.
 * @public
 *
 * @example
 * ```ts
 * import path from 'path'
 * import { ProgressWindow, inlineAsset } from '@spaceagetv/electron-progress-window'
 *
 * const brandFont = inlineAsset(path.join(__dirname, 'assets/brand.woff2'))
 *
 * ProgressWindow.configure({
 *   css: `
 *     @font-face {
 *       font-family: 'Brand';
 *       src: url('${brandFont}') format('woff2');
 *     }
 *     html { --font-family: 'Brand', sans-serif; }
 *   `,
 * })
 * ```
 */
export function inlineAsset(filePath: string, mediaType?: string): string {
  const extension = path.extname(filePath).toLowerCase()
  const type = mediaType ?? MEDIA_TYPES[extension]
  if (!type) {
    throw new Error(
      `inlineAsset: cannot infer a media type for "${
        extension || filePath
      }". Pass the mediaType argument explicitly.`,
    )
  }
  const base64 = fs.readFileSync(filePath).toString('base64')
  return `data:${type};base64,${base64}`
}
