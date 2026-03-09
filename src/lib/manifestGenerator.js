export function generateManifest(metadata, properties, events, methods) {
  const guid = (metadata.guid || '').toUpperCase()

  const mapType = (type) => {
    switch (type) {
      case 'number':  return 'number'
      case 'boolean': return 'boolean'
      case 'array':   return 'string'  // Arrays als JSON-String
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

  // Properties als Objekt { name: { type, default } }
  const propsObj = {}
  properties
    .filter(p => p.name.trim())
    .forEach(p => {
      propsObj[p.name.trim()] = {
        type:    mapType(p.type),
        default: mapDefault(p.type, p.defaultValue)
      }
    })

  // Events als Objekt { name: { parameters, description } }
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

  // Methods als Objekt
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
        name:        metadata.name || 'MyControl',
        version:     metadata.version || '1',
        displayname: metadata.displayname || metadata.name || 'MyControl',
        icon:        './assets/icon.png',
        type:        `guid://${guid}`,
        start:       './control/index.html'
      },
      enviroment: {  // Achtung: Siemens schreibt "enviroment" (Tippfehler im Schema)
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