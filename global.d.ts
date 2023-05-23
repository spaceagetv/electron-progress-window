// electron-forge injected entrypoint globals
// see: ../forge.config.js > config > plugins > renders > entryPoints
declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

declare const PROGRESS_WINDOW_WEBPACK_ENTRY: string
declare const PROGRESS_WINDOW_PRELOAD_WEBPACK_ENTRY: string

declare module '*.html' {
  const value: string
  export default value
}
