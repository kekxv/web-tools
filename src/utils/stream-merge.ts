/**
 * 深度合并两个流式对象
 * 规则：
 * - 顶层固定字段（id, model, object, created, system_fingerprint）：保留第一个值
 * - 数组：如果元素包含 index 字段，则按 index 寻找并深度合并；否则后者覆盖
 * - 字符串字段（content, reasoning_content, reasoning, text, arguments, partial_json, refusal）：拼接
 * - 其他字段：后者覆盖前者
 */
export function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target
  if (target === null || target === undefined) return source

  // 如果其中一个不是对象，或者类型不同，则后者覆盖
  if (typeof target !== 'object' || typeof source !== 'object') {
    return source
  }

  // 处理数组
  if (Array.isArray(target) && Array.isArray(source)) {
    // 检查数组元素是否是带 index 的对象（如 choices 数组或 tool_calls 数组）
    const hasIndex = (arr: any[]) => arr.length > 0 && typeof arr[0] === 'object' && 'index' in arr[0]
    
    if (hasIndex(target) || hasIndex(source)) {
      const result = [...target]

      for (const srcItem of source) {
        if (typeof srcItem === 'object' && 'index' in srcItem) {
          const idx = srcItem.index
          const existingIdx = result.findIndex(r => typeof r === 'object' && r.index === idx)

          if (existingIdx >= 0) {
            // 合并同 index 的元素
            result[existingIdx] = deepMerge(result[existingIdx], srcItem)
          } else {
            result.push(srcItem)
          }
        } else {
          result.push(srcItem)
        }
      }
      // 按 index 排序
      return result.sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))
    }

    // 其他数组：后者覆盖
    return source
  }

  // 都是对象
  const result = { ...target }

  // 固定字段列表（这些字段在流式响应中不变，保留第一个值）
  const fixedFields = ['id', 'model', 'object', 'created', 'system_fingerprint']
  // 需要拼接的字符串字段
  const concatFields = ['content', 'reasoning_content', 'reasoning', 'text', 'arguments', 'partial_json', 'refusal']

  for (const key of Object.keys(source)) {
    // 固定字段：如果 target 已有，忽略 source 的值
    if (fixedFields.includes(key) && result[key] !== undefined) {
      continue
    }

    const targetVal = result[key]
    const sourceVal = source[key]

    // 字符串拼接
    if (concatFields.includes(key) && typeof targetVal === 'string' && typeof sourceVal === 'string') {
      result[key] = targetVal + sourceVal
    } 
    // 递归合并对象
    else if (typeof targetVal === 'object' && typeof sourceVal === 'object' && targetVal !== null && sourceVal !== null) {
      result[key] = deepMerge(targetVal, sourceVal)
    }
    // 其他情况：后者覆盖
    else {
      result[key] = sourceVal
    }
  }

  return result
}

/**
 * 解析 SSE 数据，提取所有 JSON 对象
 * 支持两种格式：
 * 1. Chat Completions API 格式: data: {...}
 * 2. Messages/Responses API 格式: event: xxx \n data: {...}
 */
export function parseSSEData(text: string): any[] {
  const objects: any[] = []
  // 分割行，支持 \r\n
  const lines = text.split(/\r?\n/)

  let currentEventType: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      // 空行分隔事件，重置事件类型
      currentEventType = null
      continue
    }

    // 解析 event: 行
    if (trimmed.startsWith('event:')) {
      currentEventType = trimmed.slice(6).trim()
      continue
    }

    // 解析 data: 行
    let jsonContent = ''
    if (trimmed.includes('data:')) {
      const parts = trimmed.split('data:')
      jsonContent = parts[parts.length - 1].trim()
    } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // 如果没有 data: 但看起来像 JSON
      jsonContent = trimmed
    }

    if (!jsonContent || jsonContent === '[DONE]') continue

    try {
      const obj = JSON.parse(jsonContent)
      // 添加事件类型元数据（用于 Messages API 格式处理）
      if (currentEventType) {
        obj._eventType = currentEventType
      }
      // 如果对象本身有 type 字段，也保存为事件类型（兼容不带 event: 行的格式）
      if (!obj._eventType && obj.type) {
        obj._eventType = obj.type
      }
      objects.push(obj)
    } catch {
      // 如果解析失败，可能是多行 JSON 或被截断
    }
  }

  return objects
}

/**
 * 合并所有流式对象
 * 支持两种格式：
 * 1. Chat Completions API 格式：使用 deepMerge
 * 2. Messages/Responses API 格式：按事件类型正确处理
 */
export function mergeStreamObjects(objects: any[]): any {
  if (objects.length === 0) return null

  // 检测是否是 Messages API 格式（通过事件类型判断）
  const isMessagesAPI = objects.some(obj =>
    obj._eventType === 'message_start' ||
    obj.type === 'message_start'
  )

  if (isMessagesAPI) {
    return mergeMessagesAPIFormat(objects)
  }

  // Chat Completions API 格式：使用原有的 deepMerge
  let result: any = null
  for (const obj of objects) {
    result = deepMerge(result, obj)
  }
  return result
}

/**
 * 处理 Messages/Responses API 格式的流式数据
 * 事件类型：message_start, content_block_start, content_block_delta, content_block_stop, message_delta, message_stop
 */
function mergeMessagesAPIFormat(objects: any[]): any {
  let message: any = null
  const contentBlocks: Map<number, any> = new Map()

  for (const obj of objects) {
    const eventType = obj._eventType || obj.type

    switch (eventType) {
      case 'message_start':
        // 初始化消息对象
        if (obj.message) {
          message = { ...obj.message }
        }
        break

      case 'content_block_start':
        // 初始化内容块
        if (obj.content_block && typeof obj.index === 'number') {
          contentBlocks.set(obj.index, { ...obj.content_block })
        }
        break

      case 'content_block_delta':
        // 内容增量：处理 delta 字段
        if (typeof obj.index === 'number' && obj.delta) {
          const block = contentBlocks.get(obj.index)
          if (block) {
            // delta 类型到目标字段的映射
            const deltaTypeToTarget: Record<string, string> = {
              'text_delta': 'text',
              'thinking_delta': 'thinking',
              'signature_delta': 'signature',
              'input_json_delta': 'input',
              'image_delta': 'image',
            }

            const deltaType = obj.delta.type
            const targetField = deltaTypeToTarget[deltaType]

            // 对 delta 中的所有字段进行处理
            for (const key of Object.keys(obj.delta)) {
              if (key === 'type') continue // 跳过 type 字段

              const deltaVal = obj.delta[key]
              // 根据映射决定目标字段名
              const actualKey = targetField || key

              const blockVal = block[actualKey]

              // 字符串拼接：如果两边都是字符串，或者 blockVal 为空字符串/空对象
              if (typeof deltaVal === 'string') {
                if (typeof blockVal === 'string') {
                  block[actualKey] = blockVal + deltaVal
                } else if (blockVal === undefined || blockVal === null || blockVal === '' ||
                           (typeof blockVal === 'object' && !Array.isArray(blockVal) && Object.keys(blockVal).length === 0)) {
                  // 空值或空对象：开始拼接字符串
                  block[actualKey] = deltaVal
                } else {
                  // 其他情况（如数组、非空对象）：不能拼接，保持原样或尝试其他处理
                  block[actualKey] = blockVal
                }
              }
              // 对象或数组：深度合并
              else if (typeof blockVal === 'object' && typeof deltaVal === 'object' && blockVal !== null && deltaVal !== null) {
                block[actualKey] = deepMerge(blockVal, deltaVal)
              }
              // block 中没有该字段：直接设置
              else if (blockVal === undefined || blockVal === null) {
                block[actualKey] = deltaVal
              }
              // 其他情况：保持原样（不覆盖）
            }
          }
        }
        break

      case 'content_block_stop':
        // 内容块结束，不需要特殊处理
        break

      case 'message_delta':
        // 消息增量：更新 usage 等
        if (obj.delta && message) {
          for (const key of Object.keys(obj.delta)) {
            message[key] = obj.delta[key]
          }
        }
        if (obj.usage && message) {
          message.usage = deepMerge(message.usage, obj.usage)
        }
        break

      case 'message_stop':
        // 消息结束，不需要特殊处理
        break

      default:
        // 其他事件类型：尝试合并
        if (message) {
          message = deepMerge(message, obj)
        }
    }
  }

  // 构建 content 数组
  if (message) {
    const contentArray: any[] = []
    const sortedIndexes = Array.from(contentBlocks.keys()).sort((a, b) => a - b)
    for (const idx of sortedIndexes) {
      const block = contentBlocks.get(idx)
      // 解析 JSON 字符串字段
      const jsonFields = ['partial_json', 'input']
      for (const field of jsonFields) {
        if (typeof block[field] === 'string') {
          try {
            block[field] = JSON.parse(block[field])
          } catch {
            // 保留原始字符串（可能是不完整的 JSON）
          }
        }
      }
      contentArray.push(block)
    }
    if (contentArray.length > 0) {
      message.content = contentArray
    }
  }

  return message
}
