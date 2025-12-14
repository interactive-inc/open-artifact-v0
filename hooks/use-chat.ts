import { useQueryClient } from "@tanstack/react-query"
import type { MessageBinaryFormat } from "@v0-sdk/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useStreaming } from "@/contexts/streaming-context"
import { chatKeys, useChat as useChatQuery } from "@/hooks/api/use-chats"
import { client } from "@/lib/api/client"

type StoredMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  experimental_content?: MessageBinaryFormat
}

type Chat = {
  id: string
  demo?: string
  url?: string
  messages?: Array<StoredMessage>
}

type HistoryMessage = {
  type: "user" | "assistant"
  content: string | MessageBinaryFormat
  isStreaming?: boolean
  stream?: ReadableStream<Uint8Array> | null
}

type ChatDetails = {
  id?: string
  demo?: string
  latestVersion?: {
    demoUrl?: string
  }
  webUrl?: string
  url?: string
  error?: string
}

function getErrorMessage(
  response: Response,
  errorData: Record<string, unknown>,
): string {
  if ("message" in errorData && typeof errorData.message === "string") {
    return errorData.message
  }
  if (response.status === 429) {
    return "You have exceeded your maximum number of messages for the day. Please try again later."
  }
  return "Sorry, there was an error processing your message. Please try again."
}

function extractDemoUrl(chatDetails: ChatDetails): string | undefined {
  if (chatDetails.latestVersion?.demoUrl) {
    return chatDetails.latestVersion.demoUrl
  }
  return chatDetails.demo
}

function findChatIdInObject(
  obj: unknown,
  foundId: { value: string | undefined },
): void {
  if (!obj || typeof obj !== "object") {
    return
  }

  const record = obj as Record<string, unknown>

  if (record.chatId && typeof record.chatId === "string") {
    if (record.chatId.length > 10 && record.chatId !== "hello-world") {
      console.log("Accepting chatId:", record.chatId)
      foundId.value = record.chatId
      return
    }
  }

  if (!foundId.value && record.id && typeof record.id === "string") {
    const id = record.id
    if (
      (id.includes("-") && id.length > 20) ||
      (id.length > 15 && id !== "hello-world")
    ) {
      console.log("Accepting id as chatId:", id)
      foundId.value = id
      return
    }
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findChatIdInObject(item, foundId)
      if (foundId.value) return
    }
  } else {
    for (const value of Object.values(record)) {
      findChatIdInObject(value, foundId)
      if (foundId.value) return
    }
  }
}

/**
 * Chat hook
 */
export function useChat(chatId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const streamingContext = useStreaming()
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatHistory, setChatHistory] = useState<HistoryMessage[]>([])

  const chatQueryResult = useChatQuery(chatId || null)
  const currentChat = chatQueryResult.data
  const error = chatQueryResult.error
  const isLoadingChat = chatQueryResult.isLoading

  useEffect(() => {
    if (error) {
      console.error("Error loading chat:", error)
      router.push("/")
    }
  }, [error, router])

  useEffect(() => {
    const chat = currentChat as Chat | undefined

    if (
      chat?.messages &&
      chatHistory.length === 0 &&
      !(
        streamingContext.handoff.chatId === chatId &&
        streamingContext.handoff.stream
      )
    ) {
      const messages: HistoryMessage[] = []
      for (const msg of chat.messages) {
        messages.push({
          type: msg.role,
          content: msg.experimental_content || msg.content,
        })
      }
      setChatHistory(messages)
    }
  }, [
    currentChat,
    chatHistory.length,
    streamingContext.handoff.chatId,
    streamingContext.handoff.stream,
    chatId,
  ])

  useEffect(() => {
    if (
      streamingContext.handoff.chatId === chatId &&
      streamingContext.handoff.stream &&
      streamingContext.handoff.userMessage
    ) {
      console.log("Continuing streaming from context for chat:", chatId)

      setChatHistory((prev) => [
        ...prev,
        {
          type: "user",
          content: streamingContext.handoff.userMessage!,
        },
      ])

      setIsStreaming(true)
      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: [],
          isStreaming: true,
          stream: streamingContext.handoff.stream,
        },
      ])

      streamingContext.clearHandoff()
    }
  }, [
    chatId,
    streamingContext.handoff,
    streamingContext.clearHandoff,
    streamingContext,
  ])

  const handleSendMessage = async (
    e: React.FormEvent<HTMLFormElement>,
    attachments?: Array<{ url: string }>,
  ) => {
    e.preventDefault()
    if (!message.trim() || isLoading || !chatId) return

    const userMessage = message.trim()
    setMessage("")
    setIsLoading(true)

    setChatHistory((prev) => [...prev, { type: "user", content: userMessage }])

    try {
      const response = await client.api.chats[":id"].message.$post({
        param: { id: chatId },
        json: {
          message: userMessage,
          streaming: true,
          ...(attachments && attachments.length > 0 && { attachments }),
        },
      })

      if (!response.ok) {
        const defaultMessage =
          "Sorry, there was an error processing your message. Please try again."
        const errorMessage = await (async () => {
          try {
            const errorData = (await response.json()) as Record<string, unknown>
            return getErrorMessage(response, errorData)
          } catch (parseError) {
            console.error("Error parsing error response:", parseError)
            if (response.status === 429) {
              return "You have exceeded your maximum number of messages for the day. Please try again later."
            }
            return defaultMessage
          }
        })()
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error("No response body for streaming")
      }

      setIsStreaming(true)

      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: [],
          isStreaming: true,
          stream: response.body,
        },
      ])
    } catch (err) {
      console.error("Error:", err)

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Sorry, there was an error processing your message. Please try again."

      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: errorMessage,
        },
      ])
      setIsLoading(false)
    }
  }

  const handleStreamingComplete = async (
    finalContent: string | MessageBinaryFormat,
  ) => {
    setIsStreaming(false)
    setIsLoading(false)

    console.log(
      "Stream completed with final content:",
      JSON.stringify(finalContent, null, 2),
    )

    try {
      const response = await client.api.chats[":id"].$get({
        param: { id: chatId },
      })

      if (response.ok) {
        const chatDetails = (await response.json()) as ChatDetails

        if ("error" in chatDetails) {
          console.warn(
            "Failed to fetch updated chat details:",
            chatDetails.error,
          )
          queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) })
        }

        if (!("error" in chatDetails)) {
          const demoUrl = extractDemoUrl(chatDetails)

          queryClient.setQueryData(chatKeys.detail(chatId), {
            ...chatDetails,
            demo: demoUrl,
          })
        }
      }

      if (!response.ok) {
        console.warn("Failed to fetch updated chat details:", response.status)
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) })
      }
    } catch (err) {
      console.error("Error fetching updated chat details:", err)
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) })
    }

    if (!currentChat && finalContent && Array.isArray(finalContent)) {
      const foundId = { value: undefined as string | undefined }

      for (const item of finalContent) {
        findChatIdInObject(item, foundId)
        if (foundId.value) break
      }

      const newChatId = foundId.value

      if (newChatId) {
        console.log("Found chat ID:", newChatId)
        console.log("Fetching chat details to get demo URL...")

        try {
          const response = await client.api.chats[":id"].$get({
            param: { id: newChatId },
          })

          if (response.ok) {
            const chatDetails = (await response.json()) as ChatDetails
            console.log("Chat details:", chatDetails)

            if (!("error" in chatDetails)) {
              const demoUrl = extractDemoUrl(chatDetails)
              console.log("Demo URL from chat details:", demoUrl)

              queryClient.setQueryData(chatKeys.detail(newChatId), {
                ...chatDetails,
                id: newChatId,
                demo: demoUrl || `Generated Chat ${newChatId}`,
              })
            }
          }

          if (!response.ok) {
            console.warn("Failed to fetch chat details:", response.status)
            queryClient.setQueryData(chatKeys.detail(newChatId), {
              id: newChatId,
              demo: `Generated Chat ${newChatId}`,
            })
          }
        } catch (err) {
          console.error("Error fetching chat details:", err)
          queryClient.setQueryData(chatKeys.detail(newChatId), {
            id: newChatId,
            demo: `Generated Chat ${newChatId}`,
          })
        }
      }

      if (!newChatId) {
        console.log("No chat ID found in final content")
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

  const handleChatData = async (chatData: ChatDetails) => {
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
