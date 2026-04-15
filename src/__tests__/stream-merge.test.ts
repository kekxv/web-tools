import { describe, it, expect } from 'vitest'
import { deepMerge, parseSSEData, mergeStreamObjects } from '../utils/stream-merge'

describe('Stream Merge Utils', () => {
  describe('deepMerge', () => {
    it('应该合并基本字符串 (OpenAI content)', () => {
      const obj1 = { choices: [{ index: 0, delta: { content: 'Hello' } }] }
      const obj2 = { choices: [{ index: 0, delta: { content: ' world' } }] }
      const result = deepMerge(obj1, obj2)
      expect(result.choices[0].delta.content).toBe('Hello world')
    })

    it('应该保留固定字段的第一个值', () => {
      const obj1 = { id: 'chat-1', model: 'gpt-4' }
      const obj2 = { id: 'chat-2', model: 'gpt-4-turbo' }
      const result = deepMerge(obj1, obj2)
      expect(result.id).toBe('chat-1')
      expect(result.model).toBe('gpt-4')
    })

    it('应该拼接 tool_calls 中的 arguments', () => {
      const obj1 = {
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 0,
              id: 'call_1',
              function: { name: 'get_weather', arguments: '{"city":' }
            }]
          }
        }]
      }
      const obj2 = {
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: '"London"}' }
            }]
          }
        }]
      }
      const result = deepMerge(obj1, obj2)
      expect(result.choices[0].delta.tool_calls[0].function.arguments).toBe('{"city":"London"}')
      expect(result.choices[0].delta.tool_calls[0].id).toBe('call_1')
    })

    it('应该支持 Anthropic 格式的 text 拼接', () => {
      const obj1 = { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } }
      const obj2 = { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } }
      const result = deepMerge(obj1, obj2)
      expect(result.delta.text).toBe('Hello world')
    })

    it('应该支持 Anthropic 格式的 partial_json 拼接', () => {
      const obj1 = { delta: { type: 'input_json_delta', partial_json: '{"a":' } }
      const obj2 = { delta: { type: 'input_json_delta', partial_json: '1}' } }
      const result = deepMerge(obj1, obj2)
      expect(result.delta.partial_json).toBe('{"a":1}')
    })

    it('应该合并 reasoning_content', () => {
      const obj1 = { choices: [{ index: 0, delta: { reasoning_content: 'Let me think.' } }] }
      const obj2 = { choices: [{ index: 0, delta: { reasoning_content: '.. OK.' } }] }
      const result = deepMerge(obj1, obj2)
      expect(result.choices[0].delta.reasoning_content).toBe('Let me think... OK.')
    })

    it('应该按索引处理多个 choices', () => {
      const obj1 = { choices: [{ index: 0, delta: { content: 'A' } }, { index: 1, delta: { content: '1' } }] }
      const obj2 = { choices: [{ index: 1, delta: { content: '2' } }, { index: 0, delta: { content: 'B' } }] }
      const result = deepMerge(obj1, obj2)
      expect(result.choices[0].delta.content).toBe('AB')
      expect(result.choices[1].delta.content).toBe('12')
    })
  })

  describe('parseSSEData', () => {
    it('应该解析标准的 data: 前缀', () => {
      const input = 'data: {"id": 1}\n\ndata: {"id": 2}'
      const result = parseSSEData(input)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })

    it('应该处理包含前缀的行', () => {
      const input = '[INFO] data: {"id": 1}\n2024-01-01 data: {"id": 2}'
      const result = parseSSEData(input)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })

    it('应该跳过 [DONE]', () => {
      const input = 'data: {"id": 1}\ndata: [DONE]'
      const result = parseSSEData(input)
      expect(result).toHaveLength(1)
    })

    it('应该支持 \r\n 换行', () => {
      const input = 'data: {"id": 1}\r\ndata: {"id": 2}'
      const result = parseSSEData(input)
      expect(result).toHaveLength(2)
    })

    it('应该解析 event: 行并添加 _eventType', () => {
      const input = 'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123"}}'
      const result = parseSSEData(input)
      expect(result).toHaveLength(1)
      expect(result[0]._eventType).toBe('message_start')
      expect(result[0].type).toBe('message_start')
    })

    it('应该正确处理多个事件类型', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_123"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"text":"Hello"}}
      `.trim()
      const result = parseSSEData(input)
      expect(result).toHaveLength(2)
      expect(result[0]._eventType).toBe('message_start')
      expect(result[1]._eventType).toBe('content_block_delta')
    })
  })

  describe('mergeStreamObjects', () => {
    it('应该完整合并流数据 (Chat Completions)', () => {
      const objects = [
        { id: '1', choices: [{ index: 0, delta: { role: 'assistant' } }] },
        { id: '1', choices: [{ index: 0, delta: { content: 'Hello' } }] },
        { id: '1', choices: [{ index: 0, delta: { content: '!' } }] }
      ]
      const result = mergeStreamObjects(objects)
      expect(result.id).toBe('1')
      expect(result.choices[0].delta.role).toBe('assistant')
      expect(result.choices[0].delta.content).toBe('Hello!')
    })

    it('应该正确处理 Messages API 格式', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_e853aadc40ffafc295514ef4","type":"message","role":"assistant","model":"qwen2.5-coder:1.5b","content":[],"usage":{"input_tokens":5,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Sure"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" Here"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" is"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" the"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" count"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" from"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" "}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      // 验证消息结构
      expect(result).toBeDefined()
      expect(result.id).toBe('msg_e853aadc40ffafc295514ef4')
      expect(result.type).toBe('message')
      expect(result.role).toBe('assistant')
      expect(result.model).toBe('qwen2.5-coder:1.5b')

      // 验证 content 数组
      expect(result.content).toBeDefined()
      expect(result.content.length).toBe(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toBe('Sure! Here is the count from ')

      // 验证 usage
      expect(result.usage).toBeDefined()
      expect(result.usage.input_tokens).toBe(5)
    })

    it('应该处理多个 content_block', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_123","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"World"}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      expect(result.content.length).toBe(2)
      expect(result.content[0].text).toBe('Hello')
      expect(result.content[1].text).toBe('World')
    })

    it('应该处理 message_delta 更新 usage', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_123","usage":{"input_tokens":5,"output_tokens":0}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      expect(result.stop_reason).toBe('end_turn')
      expect(result.usage.output_tokens).toBe(5)
    })

    it('应该处理 thinking_delta 类型', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_a162532a8d65541090b6f7e4","type":"message","role":"assistant","model":"gemma4:e2b","content":[],"usage":{"input_tokens":5,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Thinking"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":" Process"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"..."}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      expect(result.id).toBe('msg_a162532a8d65541090b6f7e4')
      expect(result.content.length).toBe(1)
      expect(result.content[0].type).toBe('thinking')
      expect(result.content[0].thinking).toBe('Thinking Process...')
    })

    it('应该处理混合的 text 和 thinking content_block', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_123","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me think..."}}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hello"}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      expect(result.content.length).toBe(2)
      expect(result.content[0].type).toBe('thinking')
      expect(result.content[0].thinking).toBe('Let me think...')
      expect(result.content[1].type).toBe('text')
      expect(result.content[1].text).toBe('Hello')
    })

    it('应该处理 tool_use content_block', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_123","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_123","name":"get_weather","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"city\\":"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\\"Beijing\\"}"}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      expect(result.content.length).toBe(1)
      expect(result.content[0].type).toBe('tool_use')
      expect(result.content[0].name).toBe('get_weather')
      // partial_json 被拼接到 input 字段，然后解析为对象
      expect(result.content[0].input).toEqual({ city: "Beijing" })
    })

    it('应该处理多个 delta 字段同时出现', () => {
      const input = `
event: message_start
data: {"type":"message_start","message":{"id":"msg_123","content":[]}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"","annotations":[]}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello","annotations":[{"type":"citation","text":"ref1"}]}}
      `.trim()

      const objects = parseSSEData(input)
      const result = mergeStreamObjects(objects)

      expect(result.content[0].text).toBe('Hello')
      // annotations 应该被深度合并
      expect(result.content[0].annotations).toBeDefined()
    })
  })
})
