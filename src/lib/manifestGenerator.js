// ── manifestGenerator.js ─────────────────────────────────────
// Generates manifest.json for the CWC ZIP.
// iconPath is optional — defaults to './assets/icon.png'
// ─────────────────────────────────────────────────────────────

export function generateManifest(metadata, properties, events, methods, iconPath) {
  const guid     = (metadata.guid || '').toUpperCase()
  const resolvedIconPath = iconPath || `./assets/${metadata.iconName || 'icon.png'}`

  const mapType = (type) => {
    switch (type) {
      case 'number':  return 'number'
      case 'boolean': return 'boolean'
      case 'array':   return 'string'   // arrays serialised as JSON string
      default:        return 'string'
    }
  }

  const mapDefault = (type, value) => {
    if (value === '' || value === undefined) {
      switch (type) {
        case 'number':  return 0
        case 'boolean': return false
        default:        return ''
      }
    }
    if (type === 'number')  return parseFloat(value) || 0
    if (type === 'boolean') return value === 'true' || value === true
    return value
  }

  // Properties
  const propsObj = {}
  properties
    .filter(p => p.name.trim())
    .forEach(p => {
      propsObj[p.name.trim()] = {
        type:    mapType(p.type),
        default: mapDefault(p.type, p.defaultValue)
      }
    })

  // Events
  const eventsObj = {}
  events
    .filter(e => e.name.trim())
    .forEach(e => {
      const params = {}
      if (e.parameters) {
        e.parameters.split(',').map(s => s.trim()).filter(Boolean)
          .forEach(p => { params[p] = { type: 'string' } })
      }
      eventsObj[e.name.trim()] = { parameters: params }
    })

  // Methods
  const methodsObj = {}
  methods
    .filter(m => m.name.trim())
    .forEach(m => {
      const params = {}
      if (m.parameters) {
        m.parameters.split(',').map(s => s.trim()).filter(Boolean)
          .forEach(p => { params[p] = { type: 'string' } })
      }
      methodsObj[m.name.trim()] = { parameters: params }
    })

  const manifest = {
    mver: '1.2.0',
    control: {
      identity: {
        name:        metadata.name        || 'MyControl',
        version:     metadata.version     || '1',
        displayname: metadata.displayname || metadata.name || 'MyControl',
        icon:        resolvedIconPath,
        type:        `guid://${guid}`,
        start:       './control/index.html'
      },
      // Note: Siemens intentionally spells this "enviroment" (schema typo)
      enviroment: {
        extensions: {
          HMI: {
            mandatory: true,
            version:   '2.0'
          }
        }
      },
      contracts: {
        api: {
          methods:    methodsObj,
          events:     eventsObj,
          properties: propsObj
        }
      }
    }
  }

  return JSON.stringify(manifest, null, 2)
}
