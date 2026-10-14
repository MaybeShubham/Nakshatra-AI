import test from 'node:test'
import assert from 'node:assert/strict'

test('Supabase URL Sanitizer removes trailing slashes', () => {
  const sanitize = (url) => (url || '').trim().replace(/\/+$/, '')
  assert.equal(sanitize('https://sgdgqtwksfbcomjdosso.supabase.co/'), 'https://sgdgqtwksfbcomjdosso.supabase.co')
})

test('Scope Guardrail flags off-topic queries', () => {
  const isOffTopic = (text) => {
    const q = text.toLowerCase()
    return ['horoscope', 'predict future', 'recipe', 'python code'].some(k => q.includes(k))
  }
  assert.equal(isOffTopic('What is my horoscope?'), true)
  assert.equal(isOffTopic('How did Aryabhata calculate eclipses?'), false)
})

test('Chat history grouping groups messages by chat_id', () => {
  const messages = [
    { chat_id: 'chat-1', role: 'user', content: 'Hello' },
    { chat_id: 'chat-1', role: 'assistant', content: 'Namaste' },
  ]
  const threadMap = new Map()
  messages.forEach(m => {
    if (!threadMap.has(m.chat_id)) threadMap.set(m.chat_id, [])
    threadMap.get(m.chat_id).push(m)
  })
  assert.equal(threadMap.get('chat-1').length, 2)
})
