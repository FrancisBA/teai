const test = require('node:test')
const assert = require('node:assert/strict')
const TeaiResonance = require('../resonance.js')

test('test_update_score_without_microphone', () => {
  const score = TeaiResonance.updateScore({
    micLevel: null, spectralCentroid: null, typingRate: 5,
    idleMs: 0, previousScore: 0, dtMs: 600
  })
  assert.ok(score > 0 && score <= 1)
})

test('test_update_score_decays_when_idle', () => {
  const active = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 6, pointerRate: 10,
    idleMs: 0, previousScore: 0, dtMs: 600
  })
  const idle = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 6, pointerRate: 10,
    idleMs: 30000, previousScore: active, dtMs: 600
  })
  assert.ok(idle < active * 0.5)
})

test('test_typing_and_pointer_alone_can_reach_nudge_threshold', () => {
  let score = 0
  for (let i = 0; i < 10; i++) {
    score = TeaiResonance.updateScore({
      micLevel: null, spectralCentroid: null, typingRate: 6, pointerRate: 10,
      idleMs: 0, previousScore: score, dtMs: 600
    })
  }
  assert.ok(score >= 0.5)
  assert.equal(TeaiResonance.shouldNudge({
    score, highSinceMs: 0, lastNudgeAtMs: -100000, nowMs: 5000
  }), true)
})

test('test_update_score_is_eased_and_clamped', () => {
  const first = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 10,
    idleMs: 0, previousScore: 0, dtMs: 16
  })
  const later = TeaiResonance.updateScore({
    micLevel: 1, spectralCentroid: 1, typingRate: 10,
    idleMs: 0, previousScore: first, dtMs: 600
  })
  assert.ok(first > 0 && first < 0.1)
  assert.ok(later > first && later <= 1)
})

test('test_should_nudge_respects_cooldown', () => {
  const args = { score: 0.9, highSinceMs: 1000, nowMs: 6000, lastNudgeAtMs: -100000 }
  assert.equal(TeaiResonance.shouldNudge(args), true)
  assert.equal(TeaiResonance.shouldNudge({ ...args, lastNudgeAtMs: 5000 }), false)
  assert.equal(TeaiResonance.shouldNudge({ ...args, highSinceMs: 5000 }), false)
  assert.equal(TeaiResonance.shouldNudge({ ...args, score: 0.4 }), false)
})

test('test_link_nodes_bounds_and_make_node_coordinates', () => {
  const nodes = [0, 1, 2, 3, 4].map(sequence => TeaiResonance.makeNode({
    text: `idea ${sequence}`, score: 0.5, nowMs: sequence * 1000, sequence
  }))
  for (const node of nodes) {
    assert.ok(node.x >= 0 && node.x <= 1)
    assert.ok(node.y >= 0 && node.y <= 1)
    assert.equal(node.sequence, nodes.indexOf(node))
  }
  const links = TeaiResonance.linkNodes(nodes)
  assert.ok(links.length > 0)
  assert.ok(links.length <= nodes.length * 2)
  assert.ok(links.every(link => link.from !== link.to))
})

test('test_save_and_load_nodes_tolerate_storage_errors', () => {
  const blocked = {
    setItem() { throw new Error('blocked') },
    getItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') }
  }
  assert.equal(TeaiResonance.saveNodes([{ id: 'idea-0' }], blocked), false)
  assert.deepEqual(TeaiResonance.loadNodes(blocked), [])

  const values = new Map()
  const working = {
    setItem(key, value) { values.set(key, value) },
    getItem(key) { return values.get(key) || null },
    removeItem(key) { values.delete(key) }
  }
  const node = TeaiResonance.makeNode({
    text: 'idea', score: 0.5, nowMs: 1000, sequence: 3
  })
  assert.equal(TeaiResonance.saveNodes([node], working), true)
  assert.deepEqual(TeaiResonance.loadNodes(working), [node])
})
