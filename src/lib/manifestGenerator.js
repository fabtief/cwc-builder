export function generateManifest(metadata, properties, events, methods, iconFileName) {
  const guid = (metadata.guid || '').toUpperCase()

  const mapType = (type) => {
    switch (type) {
      case 'number':  return 'number'
      case 'boolean': return 'boolean'
      case 'array':   return 'string'  // Arrays as JSON string
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

  // Build a parameters object using paramTypes when available.
  // paramTypes is a comma-separated string of types matching the parameter names.
  const buildParams = (paramNames, paramTypes) => {
    const names = (paramNames || '').split(',').map(s => s.trim()).filter(Boolean)
    const types = (paramTypes  || '').split(',').map(s => s.trim())
    const result = {}
    names.forEach((name, i) => {
      const t = types[i] || 'string'
      result[name] = { type: ['string', 'number', 'boolean'].includes(t) ? t : 'string' }
    })
    return result
  }

  // Properties as object { name: { type, default } }
  const propsObj = {}
  properties
    .filter(p => p.name.trim())
    .forEach(p => {
      propsObj[p.name.trim()] = {
        type:    mapType(p.type),
        default: mapDefault(p.type, p.defaultValue)
      }
    })

  // Events — always single "params" argument of type object
  // WinCC Unified only reliably passes one argument; we always use a params object.
  const eventsObj = {}
  events
    .filter(e => e.name.trim())
    .forEach(e => {
      eventsObj[e.name.trim()] = {
        arguments: {
          params: { type: 'object' }
        }
      }
    })

  // Methods as object { name: { parameters } }
  const methodsObj = {}
  methods
    .filter(m => m.name.trim())
    .forEach(m => {
      methodsObj[m.name.trim()] = {
        parameters: buildParams(m.parameters, m.paramTypes)
      }
    })

  const manifest = {
    mver: '1.2.0',
    control: {
      identity: {
        name:        metadata.name || 'MyControl',
        version:     metadata.version || '1',
        displayname: metadata.displayname || metadata.name || 'MyControl',
        icon:        `./assets/${iconFileName || 'icon.ico'}`,
        type:        `guid://${guid}`,
        start:       './control/index.html'
      },
      enviroment: {  // Siemens typo in schema — preserved intentionally
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