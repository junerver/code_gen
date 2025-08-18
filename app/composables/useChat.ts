import { ref, readonly } from 'vue'
import type { ChatMessage } from '~/types/chat'

/**
 * 聊天功能组合式函数
 * @returns 聊天相关的状态和方法
 */
export const useChat = () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | undefined>()

  /**
   * 生成消息ID
   * @returns 唯一的消息ID
   */
  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加用户消息
   * @param content 消息内容
   */
  const addUserMessage = (content: string): void => {
    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role: 'user',
      timestamp: new Date()
    }
    messages.value.push(message)
  }

  /**
   * 添加助手消息
   * @param content 消息内容
   */
  const addAssistantMessage = (content: string): void => {
    const message: ChatMessage = {
      id: generateMessageId(),
      content,
      role: 'assistant',
      timestamp: new Date(),
    }
    messages.value.push(message)
  }

  /**
   * 发送消息
   * @param content 消息内容
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return

    loading.value = true
    error.value = undefined

    try {
      // 添加用户消息
      addUserMessage(content)

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模拟助手回复
      const response = `我收到了您的消息："${content}"。这是一个模拟回复，实际项目中这里会调用AI API。`
      addAssistantMessage(response)

    } catch (err) {
      error.value = err instanceof Error ? err.message : '发送消息失败'
      console.error('发送消息失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空聊天记录
   */
  const clearMessages = (): void => {
    messages.value = []
    error.value = undefined
  }

  /**
   * 删除指定消息
   * @param messageId 消息ID
   */
  const deleteMessage = (messageId: string): void => {
    const index = messages.value.findIndex(msg => msg.id === messageId)
    if (index > -1) {
      messages.value.splice(index, 1)
    }
  }

  return {
    // 只读状态
    messages: readonly(messages),
    loading: readonly(loading),
    error: readonly(error),

    // 方法
    sendMessage,
    clearMessages,
    deleteMessage,
    addUserMessage,
    addAssistantMessage
  }
}
