const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.join(__dirname, '..')
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1]
const R = require(path.join(root, 'resonance.js'))

const ids = [
  'field', 'listen', 'record', 'stop', 'recordStatus', 'recordError', 'micDenied',
  'savePanel', 'clipName', 'saveClip', 'discardClip', 'clipList', 'whisper',
  'nodeLayer', 'undoToast', 'undoMessage', 'undoButton', 'clearNodes', 'capture', 'phrase'
]

class El {
  constructor(tag = 'div', id = '', trace = null) {
    this.tagName = tag
    this.id = id
    this.trace = trace
    this.className = ''
    this.children = []
    this.listeners = {}
    this._textContent = ''
    this.value = ''
    this._hidden = false
    this.dataset = {}
    this.style = { setProperty() {} }
    this.classList = { add() {}, remove() {} }
  }
  get textContent() { return this._textContent }
  set textContent(value) {
    this._textContent = value
    if (this.id === 'undoMessage' && this.trace) this.trace.push(`message.textContent=${value}`)
  }
  get hidden() { return this._hidden }
  set hidden(value) {
    this._hidden = value
    if (this.id === 'undoToast' && this.trace) this.trace.push(`toast.hidden=${value}`)
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn) }
  fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event) }
  appendChild(child) { this.children.push(child); child.parent = this }
  replaceChildren(...kids) { this.children = kids }
  setAttribute(name, value) { this[name] = value }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this) }
  closest(selector) { return selector === '.node-delete' && this.className === 'node-delete' ? this : null }
  setPointerCapture() {}
  focus() {}
  getContext() {
    return {
      setTransform() {}, fillRect() {}, beginPath() {}, arc() {}, stroke() {},
      moveTo() {}, lineTo() {}, fill() {},
      createRadialGradient() { return { addColorStop() {} } }
    }
  }
}

async function loadPage() {
  const trace = []
  const elements = new Map(ids.map(id => [id, new El('div', id, trace)]))
  elements.get('undoToast')._hidden = true

  const store = new Map()
  const localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  }

  const timers = []
  let nextTimer = 1
  const sandbox = {
    console,
    window: {
      devicePixelRatio: 1,
      innerWidth: 1000,
      innerHeight: 800,
      addEventListener() {},
      setTimeout(fn, ms) { const id = nextTimer++; timers.push({ id, fn, ms, cleared: false }); return id },
      clearTimeout(id) { const timer = timers.find(item => item.id === id); if (timer) timer.cleared = true }
    },
    document: {
      getElementById: id => elements.get(id) || null,
      createElement: tag => new El(tag, '', trace)
    },
    localStorage,
    performance: { now: () => 1000 },
    requestAnimationFrame() {},
    navigator: {},
    indexedDB: { open: () => ({}) }
  }
  sandbox.window.TeaiResonance = R
  sandbox.window.Recording = {
    validateName: () => true,
    formatDuration: () => '',
    sortRecords: records => records,
    chooseMimeType: () => null,
    makeRecord: () => null
  }

  vm.runInNewContext(inline, sandbox)
  await new Promise(resolve => setImmediate(resolve))

  const layer = elements.get('nodeLayer')
  const toast = elements.get('undoToast')
  const message = elements.get('undoMessage')
  const undoButton = elements.get('undoButton')
  const phrase = elements.get('phrase')
  const form = elements.get('capture')

  return {
    trace,
    toast,
    message,
    layer,
    saved: () => JSON.parse(localStorage.getItem('teai.nodes') || '[]'),
    nodeElements: () => layer.children.filter(child => child.className === 'node'),
    addIdea(text) {
      phrase.value = text
      form.fire('submit', { preventDefault() {} })
    },
    deleteNode(index) {
      this.nodeElements()[index].children[0].fire('click', { stopPropagation() {} })
    },
    clickUndo() { undoButton.fire('click') },
    clickClear() { elements.get('clearNodes').fire('click') },
    fireDismiss() {
      const timer = [...timers].reverse().find(item => item.ms === 6000 && !item.cleared)
      assert.ok(timer, 'expected an un-cleared 6000ms dismiss timer')
      timer.fn()
    }
  }
}

test('delete is undone from a copied snapshot and persisted', async () => {
  const page = await loadPage()
  page.addIdea('first')
  page.addIdea('second')

  page.deleteNode(0)
  assert.deepEqual(page.saved().map(node => node.text), ['second'])
  assert.equal(page.toast.hidden, false)
  assert.equal(page.message.textContent, 'idea removed')

  page.clickUndo()
  assert.deepEqual(page.saved().map(node => node.text), ['first', 'second'])
  assert.equal(page.nodeElements().length, 2)
  assert.equal(page.toast.hidden, true)
})

test('clear is undone from a copied snapshot and persisted', async () => {
  const page = await loadPage()
  page.addIdea('first')
  page.addIdea('second')

  page.clickClear()
  assert.deepEqual(page.saved(), [])
  assert.equal(page.nodeElements().length, 0)
  assert.equal(page.message.textContent, 'ideas cleared')
  assert.equal(page.toast.hidden, false)

  page.clickUndo()
  assert.deepEqual(page.saved().map(node => node.text), ['first', 'second'])
  assert.equal(page.nodeElements().length, 2)
  assert.equal(page.toast.hidden, true)
})

test('a second destructive action replaces the pending snapshot', async () => {
  const page = await loadPage()
  page.addIdea('alpha')
  page.addIdea('beta')
  page.deleteNode(0)
  assert.deepEqual(page.saved().map(node => node.text), ['beta'])

  page.addIdea('gamma')
  page.deleteNode(0)
  assert.deepEqual(page.saved().map(node => node.text), ['gamma'])

  page.clickUndo()
  assert.deepEqual(page.saved().map(node => node.text), ['beta', 'gamma'])
})

test('toast expiry clears the snapshot', async () => {
  const page = await loadPage()
  page.addIdea('first')
  page.addIdea('second')
  page.deleteNode(0)
  assert.equal(page.toast.hidden, false)

  page.fireDismiss()
  assert.equal(page.toast.hidden, true)

  page.clickUndo()
  assert.deepEqual(page.saved().map(node => node.text), ['second'])
})

test('clearing an empty canvas does not show the undo toast', async () => {
  const page = await loadPage()
  page.clickClear()
  assert.deepEqual(page.saved(), [])
  assert.equal(page.toast.hidden, true, 'empty clear must not show a toast')
  assert.equal(page.message.textContent, '', 'empty clear must not change the message')
  page.clickUndo()
  assert.equal(page.nodeElements().length, 0)
})

test('the live region is revealed before its message is written', async () => {
  const page = await loadPage()
  page.addIdea('first')
  page.deleteNode(0)

  const revealedAt = page.trace.indexOf('toast.hidden=false')
  const announcedAt = page.trace.indexOf('message.textContent=idea removed')
  assert.ok(revealedAt !== -1, 'toast was never revealed')
  assert.ok(announcedAt !== -1, 'message was never written')
  assert.ok(revealedAt < announcedAt, 'live region must enter the tree before text is set')
})
