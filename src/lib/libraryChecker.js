// ── libraryChecker.js ────────────────────────────────────────
// Checks a library's name + content for known incompatibilities
// with CWC Builder and the WinCC Unified panel browser.
//
// Returns an array of { level: 'error'|'warn'|'info', code, message }
// ─────────────────────────────────────────────────────────────

const CHECKS = [

  // ── ERRORS: will definitely break ──────────────────────────

  {
    level: 'error',
    code: 'EXTERNAL_SCRIPT_TAG',
    label: 'External <script> tag',
    test: (name, src) => /<script[^>]+src=["']https?:\/\//i.test(src),
    message: () => 'Contains <script src="https://..."> — external scripts cannot be loaded in WinCC Unified (no internet access).'
  },
  {
    level: 'error',
    code: 'EXTERNAL_LINK_TAG',
    label: 'External <link> tag',
    test: (name, src) => /<link[^>]+href=["']https?:\/\//i.test(src),
    message: () => 'Contains <link href="https://..."> — external stylesheets cannot be loaded in WinCC Unified.'
  },
  {
    level: 'error',
    code: 'CSS_EXTERNAL_IMPORT',
    label: 'External @import',
    test: (name, src) => /@import\s+url\(["']?https?:\/\//i.test(src) || /@import\s+["']https?:\/\//i.test(src),
    message: () => 'Contains @import with an external URL — fonts and stylesheets from the web are not reachable at runtime.'
  },
  {
    level: 'error',
    code: 'ES_MODULE',
    label: 'ES module syntax',
    test: (name, src) => {
      // Only flag bare top-level import/export — UMD bundles are fine
      const hasTopLevelExport = /^export\s+(default|class|function|const|let|var)\b/m.test(src)
      const hasTopLevelImport = /^import\s+.+\s+from\s+['"`]/m.test(src)
      return hasTopLevelExport || hasTopLevelImport
    },
    message: () => 'Uses top-level ES module syntax (import/export) — the WinCC Unified panel browser does not support ES modules. Use a UMD or IIFE bundle instead.'
  },
  {
    level: 'error',
    code: 'COMMONJS',
    label: 'CommonJS (require/module.exports)',
    test: (name, src) => {
      // UMD bundles guard require/exports with typeof checks — safe in browser.
      // Only flag when there is NO typeof guard (pure CJS files).
      const isUmd = /typeof\s+(module|exports|require)\b/.test(src)
      if (isUmd) return false
      const hasBareRequire       = /\brequire\s*\(/.test(src)
      const hasBareModuleExports = /^module\.exports\s*=/m.test(src)
      return hasBareRequire || hasBareModuleExports
    },
    message: () => 'Uses CommonJS (require / module.exports) without a UMD browser guard — only browser-compatible builds work in WinCC Unified.'
  },
  {
    level: 'error',
    code: 'DOCUMENT_WRITE',
    label: 'document.write()',
    test: (name, src) => /\bdocument\.write\s*\(/.test(src),
    message: () => 'Uses document.write() — this breaks rendering inside iframes and is blocked in strict contexts.'
  },

  // ── WARNINGS: may break or behave differently ───────────────

  {
    level: 'warn',
    code: 'EXTERNAL_FETCH',
    label: 'External fetch / XHR',
    test: (name, src) => /fetch\s*\(\s*['"`]https?:\/\//i.test(src) || /new\s+XMLHttpRequest/.test(src),
    message: () => 'Makes HTTP requests (fetch / XHR) — WinCC Unified HMI panels have no internet access. Data must come from WinCC tags via WebCC.Properties.'
  },
  {
    level: 'warn',
    code: 'EXTERNAL_IMAGE',
    label: 'External image URL',
    test: (name, src) => /url\(["']?https?:\/\//i.test(src) || /src=["']https?:\/\//i.test(src),
    message: () => 'References external image URLs — images must be embedded as base64 data URIs or bundled as local files.'
  },
  {
    level: 'warn',
    code: 'LOCAL_STORAGE',
    label: 'localStorage / sessionStorage',
    test: (name, src) => /\blocalStorage\b|\bsessionStorage\b/.test(src),
    message: () => 'Uses localStorage / sessionStorage — these APIs may not be available or may be restricted in the WinCC Unified panel browser.'
  },
  {
    level: 'warn',
    code: 'INDEXED_DB',
    label: 'IndexedDB',
    test: (name, src) => /\bindexedDB\b|\bIDBFactory\b/.test(src),
    message: () => 'Uses IndexedDB — persistent browser storage is not available in WinCC Unified.'
  },
  {
    level: 'warn',
    code: 'SERVICE_WORKER',
    label: 'Service Worker',
    test: (name, src) => /\bserviceWorker\b|\bServiceWorker\b/.test(src),
    message: () => 'Registers a Service Worker — not supported in the WinCC Unified panel browser.'
  },
  {
    level: 'warn',
    code: 'WEB_SOCKET',
    label: 'WebSocket',
    test: (name, src) => /\bnew\s+WebSocket\b/.test(src),
    message: () => 'Opens a WebSocket connection — connectivity to external hosts is not available in WinCC Unified.'
  },
  {
    level: 'warn',
    code: 'GEOLOCATION',
    label: 'Geolocation API',
    test: (name, src) => /\bnavigator\.geolocation\b/.test(src),
    message: () => 'Uses navigator.geolocation — not available in WinCC Unified.'
  },
  {
    level: 'warn',
    code: 'NOTIFICATION',
    label: 'Notification API',
    test: (name, src) => /\bnew\s+Notification\b|\bNotification\.requestPermission\b/.test(src),
    message: () => 'Uses the Notification API — not supported in WinCC Unified.'
  },
  {
    level: 'warn',
    code: 'CLIPBOARD',
    label: 'Clipboard API',
    test: (name, src) => /\bnavigator\.clipboard\b/.test(src),
    message: () => 'Uses navigator.clipboard — clipboard access is restricted in sandboxed iframes.'
  },
  {
    level: 'warn',
    code: 'WRONG_EXTENSION',
    label: 'Extension / content mismatch',
    test: (name, src) => {
      if (!name) return false
      const isCss = name.endsWith('.css')
      // Heuristic: CSS files shouldn't contain function declarations; JS files shouldn't start with a selector block
      if (isCss && /^\s*(var |let |const |function |window\.|document\.)/.test(src)) return true
      if (!isCss && name.endsWith('.js') && /^\s*[.#][\w-]+\s*\{/.test(src)) return true
      return false
    },
    message: (name) => `File extension (.${name.split('.').pop()}) doesn't match the content — check that the correct file was pasted.`
  },

  // ── INFO: worth knowing ─────────────────────────────────────

  {
    level: 'info',
    code: 'LARGE_FILE',
    label: 'Large file',
    test: (name, src) => src.length > 500 * 1024,
    message: (name, src) => `File is ${(src.length / 1024).toFixed(0)} KB — WinCC Unified has a CWC ZIP size limit. Consider using a minified build.`
  },
  {
    level: 'info',
    code: 'NOT_MINIFIED',
    label: 'Not minified',
    test: (name, src) => {
      if (!name || !name.endsWith('.js')) return false
      if (name.includes('.min.')) return false
      // Check average line length — minified files have very long lines
      const lines = src.split('\n').filter(l => l.trim())
      if (lines.length === 0) return false
      const avgLen = src.length / lines.length
      return avgLen < 80 && src.length > 10 * 1024
    },
    message: (name, src) => `Appears to be an unminified build (${(src.length / 1024).toFixed(0)} KB) — a minified version would reduce ZIP size.`
  },
  {
    level: 'info',
    code: 'JQUERY_DEPENDENCY',
    label: 'jQuery dependency',
    test: (name, src) => /\bjQuery\b|\b\$\s*\(/.test(src) && !/jQuery\s*=/.test(src.substring(0, 500)),
    message: () => 'Appears to depend on jQuery — make sure jQuery is loaded before this library in the load order.'
  },
  {
    level: 'info',
    code: 'CONSOLE_USAGE',
    label: 'console.log usage',
    test: (name, src) => /\bconsole\.(log|warn|error|info)\b/.test(src),
    message: () => 'Contains console.log calls — these are visible in CWC Builder preview but silent on the real WinCC Unified HMI panel. Use HMIRuntime.Trace() for production logging.'
  },
]

// ── Run all checks on a single library ───────────────────────
export function checkLibrary(name, content) {
  if (!content || !content.trim()) return []
  return CHECKS
    .filter(check => check.test(name, content))
    .map(check => ({
      level:   check.level,
      code:    check.code,
      label:   check.label,
      message: check.message(name, content),
    }))
}

// ── Run checks on all libraries, returns map: id → issues[] ──
export function checkAllLibraries(libraries) {
  const result = {}
  libraries.forEach(lib => {
    result[lib.id] = checkLibrary(lib.name, lib.content)
  })
  return result
}

// ── Summary counts across all libraries ──────────────────────
export function summarizeIssues(issueMap) {
  let errors = 0, warnings = 0, infos = 0
  Object.values(issueMap).forEach(issues => {
    issues.forEach(i => {
      if (i.level === 'error') errors++
      else if (i.level === 'warn') warnings++
      else infos++
    })
  })
  return { errors, warnings, infos }
}