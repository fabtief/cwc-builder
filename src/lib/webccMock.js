export function generateMockHtml(indexHtml, codeJs, libraries) {
  const libScripts = libraries
    .filter(l => l.name.trim() && l.content.trim())
    .map(l => {
      if (l.name.endsWith('.css')) {
        return `<style>/* ${l.name} */\n${l.content}</style>`
      }
      return `<script>/* ${l.name} */\n${l.content}<\/script>`
    })
    .join('\n')

  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyContent = bodyMatch
  ? bodyMatch[1]
      .replace(/<script[^>]*src="\.\/libraries\/[^"]*"[^>]*><\/script>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .trim()
  : '<div id="cwc-root"></div>'

  const styleMatch = indexHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  const styles = styleMatch ? styleMatch.join('\n') : ''

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
        subscribe: function(fn) {
          this._subscribers.push(fn);
        },
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
        // Standardwerte aus contracts.properties in WebCC.Properties laden
        if (contracts && contracts.properties) {
          var props = contracts.properties;
          for (var key in props) {
            if (this.Properties[key] === undefined) {
              this.Properties[key] = props[key];
            }
          }
        }
        window.parent.postMessage({ type: 'cwc-ready' }, '*');
        if (typeof callback === 'function') {
          callback(true);
        }
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
  ${styles}
  <script>${mockJs}<\/script>
  ${libScripts}
</head>
<body>
  ${bodyContent}
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