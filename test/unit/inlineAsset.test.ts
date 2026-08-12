import fs from 'fs'
import os from 'os'
import path from 'path'
import { inlineAsset } from '../../src/ProgressWindow'

const PNG_PATH = path.resolve(
  __dirname,
  '../../images/electron-progress-window.png'
)

describe('inlineAsset', () => {
  it('should return a data URI with the media type inferred from the extension', () => {
    const uri = inlineAsset(PNG_PATH)

    expect(uri.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('should base64-encode the file contents', () => {
    const uri = inlineAsset(PNG_PATH)
    const base64 = uri.slice('data:image/png;base64,'.length)

    expect(
      Buffer.from(base64, 'base64').equals(fs.readFileSync(PNG_PATH))
    ).toBe(true)
  })

  it('should infer media types case-insensitively', () => {
    // A real file, since Linux filesystems are case-sensitive, in a unique
    // directory so parallel runs and retries cannot collide
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-asset-'))

    try {
      const upperCasePath = path.join(dir, 'brand.PNG')
      fs.copyFileSync(PNG_PATH, upperCasePath)

      const uri = inlineAsset(upperCasePath)
      expect(uri.startsWith('data:image/png;base64,')).toBe(true)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should prefer an explicitly passed media type', () => {
    const uri = inlineAsset(PNG_PATH, 'application/octet-stream')

    expect(uri.startsWith('data:application/octet-stream;base64,')).toBe(true)
  })

  it('should throw for an extension it does not know', () => {
    expect(() => inlineAsset('/tmp/brand.unknownext')).toThrow(
      'cannot infer a media type'
    )
  })

  it('should throw for a file with no extension', () => {
    expect(() => inlineAsset('/tmp/brand')).toThrow('cannot infer a media type')
  })
})
