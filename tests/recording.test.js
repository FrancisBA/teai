const test = require('node:test')
const assert = require('node:assert/strict')
const Recording = require('../recording.js')

test('test_validate_name_rejects_empty_and_long_values', () => {
  assert.equal(Recording.validateName('   '), null)
  assert.equal(Recording.validateName('x'.repeat(81)), null)
  assert.equal(Recording.validateName('  morning calm  '), 'morning calm')
})

test('test_choose_mime_type_falls_back', () => {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  assert.equal(Recording.chooseMimeType(types, type => type === 'audio/webm'), 'audio/webm')
  assert.equal(Recording.chooseMimeType(types, () => false), '')
})

test('test_make_record_requires_blob', () => {
  const base = { id: 'r1', name: 'calm', createdAt: 1000, durationMs: 12000, mimeType: 'audio/webm' }
  assert.equal(Recording.makeRecord({ ...base, blob: null }), null)
  const record = Recording.makeRecord({ ...base, blob: { size: 42 } })
  assert.equal(record.id, 'r1')
  assert.equal(record.durationMs, 12000)
})

test('test_format_duration', () => {
  assert.equal(Recording.formatDuration(0), '0:00')
  assert.equal(Recording.formatDuration(12000), '0:12')
  assert.equal(Recording.formatDuration(65000), '1:05')
})

test('test_sort_records_newest_first', () => {
  const records = [
    { id: 'a', createdAt: 100 },
    { id: 'b', createdAt: 300 },
    { id: 'c', createdAt: 200 }
  ]
  assert.deepEqual(Recording.sortRecords(records).map(r => r.id), ['b', 'c', 'a'])
})
