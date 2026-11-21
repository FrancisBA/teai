const Recording = (() => {
  const validateName = value => {
    if (typeof value !== 'string') return null
    const name = value.trim()
    if (!name || name.length > 80) return null
    return name
  }

  const chooseMimeType = (types, isSupported) => {
    for (const type of types) {
      if (isSupported(type)) return type
    }
    return ''
  }

  const makeRecord = ({ id, name, createdAt, durationMs, blob, mimeType }) => {
    if (!blob || !validateName(name)) return null
    return { id, name: validateName(name), createdAt, durationMs, mimeType, blob }
  }

  const formatDuration = ms => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(total / 60)
    const seconds = String(total % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  const sortRecords = records =>
    [...records].sort((a, b) => b.createdAt - a.createdAt)

  return { validateName, chooseMimeType, makeRecord, formatDuration, sortRecords }
})()

if (typeof window !== 'undefined') {
  window.Recording = Recording
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Recording
}
