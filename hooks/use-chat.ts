import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useStreaming } from '@/contexts/streaming-context'
import { useChat as useChatQuery, chatKeys } from '@/hooks/api/use-chats'
import { client } from '@/lib/api/client'

type Chat = {
  id: string
  demo?: string
  url?: string
  messages?: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    experimental_content?: any
  }>
}

type ChatMessage = {
  type: 'user' | 'assistant'
  content: string | any
  isStreaming?: boolean
  stream?: ReadableStream<Uint8Array> | null
}

export function useChat(chatId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { handoff, clearHandoff } = useStreaming()
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  const {
    data: currentChat,
    error,
    isLoading: isLoadingChat,
  } = useChatQuery(chatId || null)

  useEffect(() => {
    if (error) {
      console.error('Error loading chat:', error)
      router.push('/')
    }
  }, [error, router])

  useEffect(() => {
    const chat = currentChat as Chat | undefined

    if (
      chat?.messages &&
      chatHistory.length === 0 &&
      !(handoff.chatId === chatId && handoff.stream)
    ) {
      setChatHistory(
        chat.messages.map((msg) => ({
          type: msg.role,
          content: msg.experimental_content || msg.content,
        })),
      )
    }
  }, [currentChat, chatHistory.length, handoff.chatId, handoff.stream, chatId])

  useEffect(() => {
    if (handoff.chatId === chatId && handoff.stream && handoff.userMessage) {
      console.log('Continuing streaming from context for chat:', chatId)

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'user',
          content: handoff.userMessage!,
        },
      ])

      setIsStreaming(true)
      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: [],
          isStreaming: true,
          stream: handoff.stream,
        },
      ])

      clearHandoff()
    }
  }, [chatId, handoff, clearHandoff])

  const handleSendMessage = async (
    e: React.FormEvent<HTMLFormElement>,
    attachments?: Array<{ url: string }>,
  ) => {
    e.preventDefault()
    if (!message.trim() || isLoading || !chatId) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)

    setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }])

    try {
      const response = await client.api.chats[':id'].message.$post({
        param: { id: chatId },
        json: {
          message: userMessage,
          streaming: true,
          ...(attachments && attachments.length > 0 && { attachments }),
        },
      })

      if (!response.ok) {
        let errorMessage =
          'Sorry, there was an error processing your message. Please try again.'
        try {
          const errorData = await response.json() as Record<string, unknown>
          if ('message' in errorData && typeof errorData.message === 'string') {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      setIsStreaming(true)

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: [],
          isStreaming: true,
          stream: response.body,
        },
      ])
    } catch (error) {
      console.error('Error:', error)

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, there was an error processing your message. Please try again.'

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: errorMessage,
        },
      ])
      setIsLoading(false)
    }
  }

  const handleStreamingComplete = async (finalContent: any) => {
    setIsStreaming(false)
    setIsLoading(false)

    console.log(
      'Stream completed with final content:',
      JSON.stringify(finalContent, null, 2),
    )

    try {
      const response = await client.api.chats[':id'].$get({
        param: { id: chatId },
      })

      if (response.ok) {
        const chatDetails = await response.json()

        if ('error' in chatDetails) {
          console.warn('Failed to fetch updated chat details:', chatDetails.error)
          queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) })
        } else {
          const demoUrl = (chatDetails as any)?.latestVersion?.demoUrl || (chatDetails as any)?.demo

          queryClient.setQueryData(chatKeys.detail(chatId), {
            ...chatDetails,
            demo: demoUrl,
          })
        }
      } else {
        console.warn('Failed to fetch updated chat details:', response.status)
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) })
      }
    } catch (error) {
      console.error('Error fetching updated chat details:', error)
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) })
    }

    if (!currentChat && finalContent && Array.isArray(finalContent)) {
      let newChatId: string | undefined

      const searchForChatId = (obj: any) => {
        if (obj && typeof obj === 'object') {
          if (obj.chatId && typeof obj.chatId === 'string') {
            if (obj.chatId.length > 10 && obj.chatId !== 'hello-world') {
              console.log('Accepting chatId:', obj.chatId)
              newChatId = obj.chatId
            }
          }

          if (!newChatId && obj.id && typeof obj.id === 'string') {
            if (
              (obj.id.includes('-') && obj.id.length > 20) ||
              (obj.id.length > 15 && obj.id !== 'hello-world')
            ) {
              console.log('Accepting id as chatId:', obj.id)
              newChatId = obj.id
            }
          }

          if (Array.isArray(obj)) {
            obj.forEach(searchForChatId)
          } else {
            Object.values(obj).forEach(searchForChatId)
          }
        }
      }

      finalContent.forEach(searchForChatId)

      if (newChatId) {
        console.log('Found chat ID:', newChatId)
        console.log('Fetching chat details to get demo URL...')

        try {
          const response = await client.api.chats[':id'].$get({
            param: { id: newChatId },
          })

          if (response.ok) {
            const chatDetails = await response.json()
            console.log('Chat details:', chatDetails)

            if (!('error' in chatDetails)) {
              const demoUrl =
                (chatDetails as any)?.latestVersion?.demoUrl || (chatDetails as any)?.demo
              console.log('Demo URL from chat details:', demoUrl)

              queryClient.setQueryData(chatKeys.detail(newChatId), {
                ...chatDetails,
                id: newChatId,
                demo: demoUrl || `Generated Chat ${newChatId}`,
              })
            }
          } else {
            console.warn('Failed to fetch chat details:', response.status)
            queryClient.setQueryData(chatKeys.detail(newChatId), {
              id: newChatId,
              demo: `Generated Chat ${newChatId}`,
            })
          }
        } catch (error) {
          console.error('Error fetching chat details:', error)
          queryClient.setQueryData(chatKeys.detail(newChatId), {
            id: newChatId,
            demo: `Generated Chat ${newChatId}`,
          })
        }
      } else {
        console.log('No chat ID found in final content')
      }
    }

    setChatHistory((prev) => {
      const updated = [...prev]
      const lastIndex = updated.length - 1
      if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: finalContent,
          isStreaming: false,
          stream: undefined,
        }
      }
      return updated
    })
  }

  const handleChatData = async (chatData: any) => {
    if (chatData.id && !currentChat) {
      queryClient.setQueryData(chatKeys.detail(chatData.id), {
        id: chatData.id,
        url: chatData.webUrl || chatData.url,
      })
    }
  }

  return {
    message,
    setMessage,
    currentChat: currentChat as Chat | undefined,
    isLoading,
    setIsLoading,
    isStreaming,
    chatHistory,
    isLoadingChat,
    handleSendMessage,
    handleStreamingComplete,
    handleChatData,
  }
}
