export function generateMockHtml(indexHtml, codeJs, libraries, zoomFactor = 1) {
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

  // Compensate for parent page zoom so click/hover hit zones are accurate
  const zoomStyle = zoomFactor !== 1
    ? `<style>html { zoom: ${1 / zoomFactor}; }</style>`
    : ''

  const mockJs = `
    window.WebCC = {

      Properties: {},

      Events: {
        fire: function(name) {
          // Collect positional args after name, log as ordered array
          var args = Array.prototype.slice.call(arguments, 1);
          window.parent.postMessage({ type: 'cwc-event', name: name, params: args }, '*');
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
        this._contracts = contracts || {};
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

    // ── Console capture ───────────────────────────────────────
    // Intercepts console.log/warn/error/info and forwards to
    // the CWC Builder event log via cwc-console postMessage.
    (function() {
      // Save originals BEFORE patching so internal calls don't double-post
      var _origLog = console.log.bind(console);

      var methods = { log: 'log', warn: 'warn', error: 'error', info: 'info' };
      Object.keys(methods).forEach(function(method) {
        var original = console[method].bind(console);
        console[method] = function() {
          original.apply(console, arguments);
          var parts = Array.prototype.slice.call(arguments).map(function(a) {
            try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
            catch(e) { return String(a); }
          });
          window.parent.postMessage({ type: 'cwc-console', level: method, message: parts.join(' ') }, '*');
        };
      });

      // ── HMIRuntime.Trace ──────────────────────────────────
      // The correct WinCC Unified API for diagnostic output.
      // Shown as a purple ◈ entry in the CWC Builder event log.
      // On real HMI panels this writes to the TIA Portal Trace Viewer.
      // console.log() is SILENT on real panels — always prefer HMIRuntime.Trace.
      function _trace() {
        var parts = Array.prototype.slice.call(arguments).map(function(a) {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
          catch(e) { return String(a); }
        });
        _origLog.apply(console, arguments); // use pre-patch original — avoids double log entry
        window.parent.postMessage({ type: 'cwc-console', level: 'trace', message: parts.join(' ') }, '*');
      }

      window.HMIRuntime = { Trace: _trace };
      window.Trace = _trace; // preview-only alias — not available on real HMI panels
    })();

    // ── Message handler ───────────────────────────────────────
    window.addEventListener('message', function(e) {
      if (!e.data) return;

      // Property push from Property Panel
      if (e.data.type === 'cwc-set') {
        window.WebCC._trigger(e.data.name, e.data.value);
      }

      // Method call from Method Panel.
      // Calls contracts.methods[name](params) if registered, then always
      // dispatches a CustomEvent for addEventListener-style handlers:
      //   document.addEventListener('cwc-method-Reset', fn)
      if (e.data.type === 'cwc-call-method') {
        var methodName = e.data.name;
        var params = e.data.params || {};
        var contracts = window.WebCC._contracts;
        if (contracts && contracts.methods && typeof contracts.methods[methodName] === 'function') {
          try { contracts.methods[methodName](params); }
          catch(err) {
            window.parent.postMessage(
              { type: 'cwc-error', message: 'Method ' + methodName + ': ' + err.message }, '*'
            );
          }
        }
        document.dispatchEvent(new CustomEvent('cwc-method-' + methodName, { detail: params }));
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