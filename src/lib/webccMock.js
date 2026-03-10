// ============================================================
// webccMock.js
// Generates a self-contained HTML document for the iframe
// preview. Respects index.html load order and head/body
// placement, and compensates for parent page zoom level so
// click/hover hit zones are always accurate.
// ============================================================

export function generateMockHtml(indexHtml, codeJs, libraries, zoomFactor = 1) {

  // ── Build a lookup: filename → inlined content ────────────
  const libMap = {}
  libraries
    .filter(l => l.name.trim() && l.content.trim())
    .forEach(l => { libMap[l.name.trim()] = l.content })

  // ── Parse <head> from index.html ─────────────────────────
  const headMatch = indexHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headRaw = headMatch ? headMatch[1] : ''

  // ── Parse <body> from index.html ─────────────────────────
  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyRaw = bodyMatch ? bodyMatch[1] : '<div id="cwc-root"></div>'

  // ── Inline a library tag ──────────────────────────────────
  const inlineLibTag = (tag) => {
    const linkMatch = tag.match(/href="\.\/libraries\/([^"]+)"/)
    if (linkMatch) {
      const name = linkMatch[1]
      const content = libMap[name]
      if (content) return `<style>/* ${name} */\n${content}\n</style>`
      return `<!-- library not found: ${name} -->`
    }
    const scriptMatch = tag.match(/src="\.\/libraries\/([^"]+)"/)
    if (scriptMatch) {
      const name = scriptMatch[1]
      if (name === 'webcc.min.js') return null
      const content = libMap[name]
      if (content) return `<script>/* ${name} */\n${content}\n<\/script>`
      return `<!-- library not found: ${name} -->`
    }
    return null
  }

  // ── Process <head> ────────────────────────────────────────
  const headLines = []
  headRaw.replace(/<link[^>]+href="\.\/libraries\/[^"]*"[^>]*\/?>/gi, (tag) => {
    const inlined = inlineLibTag(tag)
    if (inlined) headLines.push(inlined)
  })
  headRaw.replace(/<script[^>]+src="\.\/libraries\/[^"]*"[^>]*><\/script>/gi, (tag) => {
    const inlined = inlineLibTag(tag)
    if (inlined) headLines.push(inlined)
  })

  // Keep user <style> blocks verbatim
  const userStyles = []
  headRaw.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (tag) => {
    userStyles.push(tag)
  })

  // ── Process <body> ────────────────────────────────────────
  const bodyContent = bodyRaw
    .replace(/<script[^>]*src="\.\/libraries\/[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<script[^>]*src="\.\/code\.js"[^>]*><\/script>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim()

  // Collect body scripts in index.html order
  const bodyScripts = []
  bodyRaw.replace(/<script[^>]+src="\.\/libraries\/([^"]+)"[^>]*><\/script>/gi, (tag, name) => {
    if (name === 'webcc.min.js') return
    const content = libMap[name]
    if (content) bodyScripts.push(`<script>/* ${name} */\n${content}\n<\/script>`)
    else bodyScripts.push(`<!-- library not found: ${name} -->`)
  })

  // ── Zoom compensation ─────────────────────────────────────
  // When the parent page is zoomed (e.g. 80%), mouse event
  // coordinates are reported in zoomed CSS pixels, shifting
  // hit zones away from their visual positions inside the
  // iframe. Applying an inverse zoom to the iframe's <html>
  // element realigns coordinates with visual positions.
  const zoomStyle = zoomFactor !== 1 ? `
  <style>
    html { zoom: ${(1 / zoomFactor).toFixed(4)}; }
  </style>` : ''

  // ── WebCC mock implementation ─────────────────────────────
  const mockJs = `
    window.WebCC = {
      Properties: {},

      Events: {
        fire: function(name, params) {
          window.parent.postMessage({ type: 'cwc-event', name: name, params: params }, '*');
        }
      },

      onPropertyChanged: {
        _subscribers: [],
        subscribe: function(fn) { this._subscribers.push(fn); },
        unsubscribe: function(fn) {
          this._subscribers = this._subscribers.filter(function(s) { return s !== fn; });
        },
        _notify: function(key, value) {
          this._subscribers.forEach(function(fn) {
            try { fn({ key: key, value: value }); } catch(e) {
              window.parent.postMessage({ type: 'cwc-error', message: e.message }, '*');
            }
          });
        }
      },

      start: function(callback, contracts, extensions, timeout) {
        if (contracts && contracts.properties) {
          var props = contracts.properties;
          for (var key in props) {
            if (this.Properties[key] === undefined) {
              this.Properties[key] = props[key];
            }
          }
        }
        window.parent.postMessage({ type: 'cwc-ready' }, '*');
        if (typeof callback === 'function') callback(true);
      },

      _trigger: function(key, value) {
        this.Properties[key] = value;
        this.onPropertyChanged._notify(key, value);
      }
    };

    window.webcc = window.WebCC;

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'cwc-set') {
        window.WebCC._trigger(e.data.name, e.data.value);
      }
    });
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
  </style>
  ${zoomStyle}
  ${userStyles.join('\n  ')}
  ${headLines.join('\n  ')}
  <script>${mockJs}<\/script>
</head>
<body>
  ${bodyContent}
  ${bodyScripts.join('\n  ')}
  <script>
    try {
      ${codeJs}
    } catch(e) {
      window.parent.postMessage({ type: 'cwc-error', message: e.message }, '*');
    }
  <\/script>
</body>
</html>`
}
