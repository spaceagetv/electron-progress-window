## [2.1.3](https://github.com/spaceagetv/electron-progress-window/compare/v2.1.2...v2.1.3) (2025-12-28)

### Bug Fixes

* add etc/.gitkeep to track etc folder in git ([c80b3d2](https://github.com/spaceagetv/electron-progress-window/commit/c80b3d2a7fa725d3c3499e9fbbe66f67c0573dcc))

## [2.1.2](https://github.com/spaceagetv/electron-progress-window/compare/v2.1.1...v2.1.2) (2025-12-28)

### Bug Fixes

* create etc folder for API extractor reports ([ec1d667](https://github.com/spaceagetv/electron-progress-window/commit/ec1d6677abfb8da529ca8e9753f44159a845a1d9))

## [2.1.1](https://github.com/spaceagetv/electron-progress-window/compare/v2.1.0...v2.1.1) (2025-12-28)

### Bug Fixes

* upgrade npm to 11.5.1+ for trusted publishing OIDC support ([836bc37](https://github.com/spaceagetv/electron-progress-window/commit/836bc374f3c2c718d167f7060ae59753f25623a7))

## [2.1.0](https://github.com/spaceagetv/electron-progress-window/compare/v2.0.1...v2.1.0) (2025-12-28)

### Features

* configure npm trusted publishing with provenance ([417c61c](https://github.com/spaceagetv/electron-progress-window/commit/417c61cdfa5f7b5e8f399a52b7bf5188bf3e97fc))

### Bug Fixes

* configure npm provenance publishing for trusted publishing ([c04976e](https://github.com/spaceagetv/electron-progress-window/commit/c04976e242f3b249256ead8b12f750c8f58f44c9))
* Playwright E2E tests + code reorg ([f71f9ca](https://github.com/spaceagetv/electron-progress-window/commit/f71f9ca1b0a2296460d7cce61976c79941c934c5))
* remove registry-url from setup-node for provenance publishing ([82ce016](https://github.com/spaceagetv/electron-progress-window/commit/82ce0165379a7aa6d503c77fc02d237c8ee953a2))
* update PR workflow to use Node.js 22.x ([868d966](https://github.com/spaceagetv/electron-progress-window/commit/868d9667f411785fdb45de97e1b87b89a9e5d3cc))
* use manual npm publish with provenance after semantic-release ([c451352](https://github.com/spaceagetv/electron-progress-window/commit/c451352ebf5bd3c781f21fdbb99684aeea1fd130))

## [2.0.1](https://github.com/spaceagetv/electron-progress-window/compare/v2.0.0...v2.0.1) (2025-12-28)


### Bug Fixes

* package.json url format issue ([c05cede](https://github.com/spaceagetv/electron-progress-window/commit/c05cede0379ab2cc1465453764380f4a3032d5e2))

# [2.0.0](https://github.com/spaceagetv/electron-progress-window/compare/v1.5.1...v2.0.0) (2025-12-27)


### Bug Fixes

* CSS variable mismatch and remove commented code ([4e653fa](https://github.com/spaceagetv/electron-progress-window/commit/4e653fa4907df2d063855ba7f09bd054453481cf))
* improve type compatibility and test support for security fix ([ebc8635](https://github.com/spaceagetv/electron-progress-window/commit/ebc86352dcf0f25057958399e12976dff3d1b371))
* prevent memory leak in preload IPC listeners ([de8e37a](https://github.com/spaceagetv/electron-progress-window/commit/de8e37af3675c89c3111667a3e68464c2f68433b))
* resolve linter errors (prettier formatting, TSDoc escape) ([733ae90](https://github.com/spaceagetv/electron-progress-window/commit/733ae90bdf3cac9144d26370d98b65384799504f))
* restore embedded preload for Webpack compatibility ([692f78c](https://github.com/spaceagetv/electron-progress-window/commit/692f78cd7dcda9bfd25fb2a7442b66e0a13fccb1))
* update package.json and README for open source release ([b6b6a28](https://github.com/spaceagetv/electron-progress-window/commit/b6b6a28e5af0c5f011fe24c0fa2765f477178ae3))
* use CancelableEvent for Node.js compatibility ([aa7ea55](https://github.com/spaceagetv/electron-progress-window/commit/aa7ea55e36a4c8b74089da1cc96980e9088f8135))


### Features

* remove all runtime dependencies ([8488664](https://github.com/spaceagetv/electron-progress-window/commit/8488664443f1f6af67163e57fdf365cb3e66cddf))


### security

* implement context isolation with preload script ([a059b7d](https://github.com/spaceagetv/electron-progress-window/commit/a059b7d8cc225f649c9e4424c5070391221f314c))


### BREAKING CHANGES

* The renderer now uses contextIsolation and sandbox mode.

This is a major security improvement that follows Electron best practices:

- Enable contextIsolation: true (default since Electron 12)
- Disable nodeIntegration: false (default since Electron 5)
- Enable sandbox: true for additional security
- Create preload script that uses contextBridge to expose only necessary IPC methods
- Update renderer to use the exposed progressWindowAPI instead of direct ipcRenderer access
- Use textContent instead of innerHTML for title/detail to prevent XSS
- Update post-build to embed preload script at build time

The preload script exposes a minimal API:
- cancelItem(itemId)
- togglePauseItem(itemId)
- updateContentSize(dimensions)
- onItemAdd(callback)
- onItemUpdate(callback)
- onItemRemove(callback)

This prevents malicious code in title/detail fields from accessing Node.js APIs.

## [1.5.1](https://github.com/spaceagetv/electron-progress-window/compare/v1.5.0...v1.5.1) (2025-07-11)


### Bug Fixes

* ensure delays are observed ([1704992](https://github.com/spaceagetv/electron-progress-window/commit/1704992fff9a17ff5473bf6340da6f2da2279441))

# [1.5.0](https://github.com/spaceagetv/electron-progress-window/compare/v1.4.0...v1.5.0) (2023-07-08)


### Bug Fixes

* remove app progressBar when indeterminite are finished ([1774d43](https://github.com/spaceagetv/electron-progress-window/commit/1774d4321ae568898aad65699f4498079a4383a0))


### Features

* delayIndeterminate & showWhenEstimatedTimeExceeds ([446ebe1](https://github.com/spaceagetv/electron-progress-window/commit/446ebe10c74130c37cda3469dca3c11807b0445f))

# [1.4.0](https://github.com/spaceagetv/electron-progress-window/compare/v1.3.3...v1.4.0) (2023-07-02)


### Features

* new option: delayClosing ([493f4ba](https://github.com/spaceagetv/electron-progress-window/commit/493f4ba401d233e42b08c55f45b1adb83b1a2d32))

## [1.3.3](https://github.com/spaceagetv/electron-progress-window/compare/v1.3.2...v1.3.3) (2023-06-26)


### Bug Fixes

* window resizing ([123b281](https://github.com/spaceagetv/electron-progress-window/commit/123b2816abd512a916430a27e4c9b91081a741b3))

## [1.3.2](https://github.com/spaceagetv/electron-progress-window/compare/v1.3.1...v1.3.2) (2023-06-23)


### Bug Fixes

* missing cssVars ([77c96e3](https://github.com/spaceagetv/electron-progress-window/commit/77c96e314408c677431d99c05a0ebf1529bc6767))

## [1.3.1](https://github.com/spaceagetv/electron-progress-window/compare/v1.3.0...v1.3.1) (2023-06-23)


### Bug Fixes

* no —page-background by default ([e932f8a](https://github.com/spaceagetv/electron-progress-window/commit/e932f8af0040fb36857f14b5a27718c3c39fc1a8))

# [1.3.0](https://github.com/spaceagetv/electron-progress-window/compare/v1.2.1...v1.3.0) (2023-06-23)


### Bug Fixes

* **🪟:** better window resizing ([15cdd6e](https://github.com/spaceagetv/electron-progress-window/commit/15cdd6e87b6a17dd3449215f8a629e55193439ac))


### Features

* redesign + css variables ([94924e0](https://github.com/spaceagetv/electron-progress-window/commit/94924e0246ced30165fb3abf420c5dbfca7ccc83))

## [1.2.1](https://github.com/spaceagetv/electron-progress-window/compare/v1.2.0...v1.2.1) (2023-06-20)


### Bug Fixes

* **🛠️:** better window resizing ([e2ea3ba](https://github.com/spaceagetv/electron-progress-window/commit/e2ea3ba97fad781647511488aa398fbf2a049b22))
* **🛠️:** ProgressItem option setters for all properties ([e4e3b71](https://github.com/spaceagetv/electron-progress-window/commit/e4e3b71241edb0145d12c1efbb098067dd230843))
* **🛠️:** renderer: only repaint changed properties ([644d53a](https://github.com/spaceagetv/electron-progress-window/commit/644d53af72bf09dbf9954728ee928aa4a4b642c1))

# [1.2.0](https://github.com/spaceagetv/electron-progress-window/compare/v1.1.3...v1.2.0) (2023-06-20)


### Features

* use function for ProgressWindow.configure() ([7545e86](https://github.com/spaceagetv/electron-progress-window/commit/7545e86dbf8d00c2dfb64c6ea9b0627828e8c94d))

## [1.1.3](https://github.com/spaceagetv/electron-progress-window/compare/v1.1.2...v1.1.3) (2023-06-20)


### Bug Fixes

* Webpack package compatibility ([41de9d7](https://github.com/spaceagetv/electron-progress-window/commit/41de9d7b1a75230f7454b412e0f3d7495ef7d2c6))

## [1.1.2](https://github.com/spaceagetv/electron-progress-window/compare/v1.1.1...v1.1.2) (2023-06-20)


### Bug Fixes

* sinon is only a devDependency ([58126b2](https://github.com/spaceagetv/electron-progress-window/commit/58126b2985a9494cbf9e78205c40f6eb650184b3))
* window.name is electron-progress-window ([e9fcbcf](https://github.com/spaceagetv/electron-progress-window/commit/e9fcbcf592fa29400c44bbaedb0c31e17089a1e9))

## [1.1.1](https://github.com/spaceagetv/electron-progress-window/compare/v1.1.0...v1.1.1) (2023-05-31)


### Bug Fixes

* don’t removeComments, so we still get intelliSense ([2039000](https://github.com/spaceagetv/electron-progress-window/commit/2039000e4a66b790562971f83a8374eca3f2096a))
* prevent navigation in ProgressWindow ([f219961](https://github.com/spaceagetv/electron-progress-window/commit/f21996126a8ab440f7191c5cd8235088dc46ba15))
* updateContentSize() on every update ([c684a85](https://github.com/spaceagetv/electron-progress-window/commit/c684a856997f47d2f84b7d65b8e7deb2794c9a5c))

# [1.1.0](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.12...v1.1.0) (2023-05-31)


### Features

* webpack compatibility ([8380f92](https://github.com/spaceagetv/electron-progress-window/commit/8380f923ed5ec5f21287dc2a43c4122161030da1))

## [1.0.12](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.11...v1.0.12) (2023-05-29)


### Bug Fixes

* maybe fix issues using module in webpack build ([3d078cc](https://github.com/spaceagetv/electron-progress-window/commit/3d078cc96695c853cf0bb4a8ffc99c3440a39da9))

## [1.0.11](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.10...v1.0.11) (2023-05-29)


### Bug Fixes

* types for ProgressItemOptions ([9d2dc48](https://github.com/spaceagetv/electron-progress-window/commit/9d2dc48019fa69bae4fba6ecc9b34bbf182318a3))

## [1.0.10](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.9...v1.0.10) (2023-05-29)


### Bug Fixes

* npm publish? ([90fee62](https://github.com/spaceagetv/electron-progress-window/commit/90fee6254ef8c0f89bd465c4d8297c88cc342e2c))

## [1.0.9](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.8...v1.0.9) (2023-05-29)


### Bug Fixes

* remove package.private to publish to GitHub (privately) ([5cef60a](https://github.com/spaceagetv/electron-progress-window/commit/5cef60a11470f309358ff4eecc467340ee78d8a8))

## [1.0.8](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.7...v1.0.8) (2023-05-29)


### Bug Fixes

* .npmrc to build for GitHub packages ([8dd3ae0](https://github.com/spaceagetv/electron-progress-window/commit/8dd3ae03ebf9bf2bb57410cf73a56d0b80af4748))

## [1.0.7](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.6...v1.0.7) (2023-05-26)

## [1.0.6](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.5...v1.0.6) (2023-05-26)


### Bug Fixes

* 🛠️🛠️🛠️ lots of bits and pieces ([e1926df](https://github.com/spaceagetv/electron-progress-window/commit/e1926df4756d399e94f6283a5522e0fee0def08a))

## [1.0.5](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.4...v1.0.5) (2023-05-26)

## [1.0.4](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.3...v1.0.4) (2023-05-26)


### Bug Fixes

* etc ƒ to keep API Extractor happy ([bf80967](https://github.com/spaceagetv/electron-progress-window/commit/bf8096780dbf3eec5d08a111096014e520e4d7f4))

## [1.0.3](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.2...v1.0.3) (2023-05-26)


### Bug Fixes

* doc updates in release.yml ([8837168](https://github.com/spaceagetv/electron-progress-window/commit/8837168f351472469511989c303d42c8707d5992))

## [1.0.2](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.1...v1.0.2) (2023-05-26)


### Bug Fixes

* build before docs ([2f5ef3b](https://github.com/spaceagetv/electron-progress-window/commit/2f5ef3b257271105114fd4502e3ef71b2a28978a))

## [1.0.1](https://github.com/spaceagetv/electron-progress-window/compare/v1.0.0...v1.0.1) (2023-05-26)


### Bug Fixes

* 🎛️ switch from electron-mocha to mocha ([2b19a5e](https://github.com/spaceagetv/electron-progress-window/commit/2b19a5e5b8811b4c0945a93fada11530cf777b18))

# 1.0.0 (2023-05-25)


### Features

* new module ([c7ae432](https://github.com/spaceagetv/electron-progress-window/commit/c7ae432ad458a0a0e82db207a0bbd096b6d41e07))

## [1.0.1](https://github.com/spaceagetv/electron-mocks/compare/v1.0.0...v1.0.1) (2023-05-22)


### Bug Fixes

* public ([dea1cb4](https://github.com/spaceagetv/electron-mocks/commit/dea1cb4030f4e1eb734abbad2b980d18df5ed733))

# 1.0.0 (2023-05-22)


### Bug Fixes

* testing errors + don't test during release ([19e6272](https://github.com/spaceagetv/electron-mocks/commit/19e6272035c0d4e7beb66333bed5e4c6a7d9ccf9))


### Features

* build esm + cjs ([efd172e](https://github.com/spaceagetv/electron-mocks/commit/efd172efe87fa84e9763e08e5fb8677bf192dc18))
