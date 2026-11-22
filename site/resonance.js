const TeaiResonance = (() => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

  const ringColor = radiusRatio => {
    const t = clamp(radiusRatio, 0, 1)
    return { hue: 24 + t * 256, saturation: 78, lightness: 30 + t * 38 }
  }

  const updateScore = ({ micLevel, spectralCentroid, typingRate, pointerRate, idleMs, previousScore, dtMs }) => {
    const mic = Number.isFinite(micLevel) ? clamp(micLevel * 3, 0, 1) : 0
    const centroid = Number.isFinite(spectralCentroid) ? clamp(spectralCentroid, 0, 1) : 0
    const typing = clamp((Number.isFinite(typingRate) ? typingRate : 0) / 6, 0, 1)
    const pointer = clamp((Number.isFinite(pointerRate) ? pointerRate : 0) / 10, 0, 1)
    let target = clamp(0.30 * mic + 0.10 * centroid + 0.35 * typing + 0.25 * pointer, 0, 1)
    if (idleMs > 8000) {
      target *= Math.exp(-(idleMs - 8000) / 12000)
    }
    const previous = clamp(Number.isFinite(previousScore) ? previousScore : 0, 0, 1)
    const factor = clamp((Number.isFinite(dtMs) ? dtMs : 0) / 600, 0, 1)
    return clamp(previous + (target - previous) * factor, 0, 1)
  }

  const shouldNudge = ({ score, highSinceMs, lastNudgeAtMs, nowMs }) =>
    score >= 0.5 &&
    Number.isFinite(highSinceMs) &&
    nowMs - highSinceMs >= 4000 &&
    nowMs - lastNudgeAtMs >= 20000

  const makeNode = ({ text, score, nowMs, sequence }) => ({
    id: `idea-${sequence}`,
    text,
    score,
    sequence,
    createdAt: nowMs,
    x: 0.5 + 0.32 * Math.sin(sequence * 2.399),
    y: 0.5 + 0.26 * Math.cos(sequence * 1.618)
  })

  const linkNodes = nodes => {
    const links = []
    const outgoing = new Map(nodes.map(node => [node.id, 0]))
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (outgoing.get(nodes[i].id) >= 2) break
        if (Math.abs(nodes[i].createdAt - nodes[j].createdAt) > 10000) continue
        if (Math.abs(nodes[i].score - nodes[j].score) > 0.35) continue
        links.push({ from: nodes[i].id, to: nodes[j].id })
        outgoing.set(nodes[i].id, outgoing.get(nodes[i].id) + 1)
      }
    }
    return links
  }

  const isValidNode = node =>
    node && typeof node.id === 'string' && typeof node.text === 'string' &&
    Number.isFinite(node.sequence) && Number.isFinite(node.createdAt) &&
    Number.isFinite(node.x) && Number.isFinite(node.y)

  const saveNodes = (nodes, storage) => {
    try {
      storage.setItem('teai.nodes', JSON.stringify(nodes))
      return true
    } catch (error) {
      return false
    }
  }

  const loadNodes = storage => {
    try {
      const saved = JSON.parse(storage.getItem('teai.nodes') || '[]')
      if (!Array.isArray(saved)) return []
      return saved.filter(isValidNode)
    } catch (error) {
      try {
        storage.removeItem('teai.nodes')
      } catch (cleanupError) {
        return []
      }
      return []
    }
  }

  const nodeHue = sequence => (((Number.isFinite(sequence) ? sequence : 0) * 47) % 360 + 360) % 360

  const removeNode = (nodes, id) => nodes.filter(node => node.id !== id)

  const clearNodes = () => []

  const moveNode = (nodes, id, x, y) => nodes.map(node => node.id === id ? { ...node, x: Number.isFinite(x) ? clamp(x, 0, 1) : node.x, y: Number.isFinite(y) ? clamp(y, 0, 1) : node.y } : node)

  const captureNodes = nodes => nodes.map(node => ({ ...node }))

  return { updateScore, shouldNudge, makeNode, linkNodes, saveNodes, loadNodes, ringColor, removeNode, clearNodes, moveNode, nodeHue, captureNodes }
})()

if (typeof window !== 'undefined') {
  window.TeaiResonance = TeaiResonance
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeaiResonance
}
