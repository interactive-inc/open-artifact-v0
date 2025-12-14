"use client"

import type { MessageBinaryFormat } from "@v0-sdk/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import {
  clearPromptFromStorage,
  createImageAttachment,
  createImageAttachmentFromStored,
  type ImageAttachment,
  loadPromptFromStorage,
  PromptInput,
  PromptInputImageButton,
  PromptInputImagePreview,
  PromptInputMicButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  savePromptToStorage,
} from "@/components/ai-elements/prompt-input"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { PreviewPanel } from "@/components/chat/preview-panel"
import { BottomToolbar } from "@/components/shared/bottom-toolbar"
import { ResizableLayout } from "@/components/shared/resizable-layout"
import { client } from "@/lib/api/client"

function SearchParamsHandler({ onReset }: { onReset: () => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const reset = searchParams.get("reset")
    if (reset === "true") {
      onReset()

      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("reset")
      window.history.replaceState({}, "", newUrl.pathname)
    }
  }, [searchParams, onReset])

  return null
}

export function HomeClient() {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showChatInterface, setShowChatInterface] = useState(false)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [chatHistory, setChatHistory] = useState<
    Array<{
      type: "user" | "assistant"
      content: string | MessageBinaryFormat
      isStreaming?: boolean
      stream?: ReadableStream<Uint8Array> | null
    }>
  >([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentChat, setCurrentChat] = useState<{
    id: string
    demo?: string
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat")
  const [isStreaming, setIsStreaming] = useState(false)
  const _router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleReset = useCallback(() => {
    setShowChatInterface(false)
    setChatHistory([])
    setCurrentChatId(null)
    setCurrentChat(null)
    setMessage("")
    setAttachments([])
    setIsLoading(false)
    setIsStreaming(false)
    setIsFullscreen(false)
    setRefreshKey((prev) => prev + 1)

    clearPromptFromStorage()

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 0)
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    const storedData = loadPromptFromStorage()
    if (storedData) {
      setMessage(storedData.message)
      if (storedData.attachments.length > 0) {
        const restoredAttachments = storedData.attachments.map(
          createImageAttachmentFromStored,
        )
        setAttachments(restoredAttachments)
      }
    }
  }, [])

  useEffect(() => {
    if (message.trim() || attachments.length > 0) {
      savePromptToStorage(message, attachments)
    } else {
      clearPromptFromStorage()
    }
  }, [message, attachments])

  const handleImageFiles = async (files: File[]) => {
    try {
      const newAttachments = await Promise.all(
        files.map((file) => createImageAttachment(file)),
      )
      setAttachments((prev) => [...prev, ...newAttachments])
    } catch (error) {
      console.error("Error processing image files:", error)
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const handleDragOver = () => {
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = () => {
    setIsDragOver(false)
  }

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    const currentAttachments = [...attachments]

    clearPromptFromStorage()

    setMessage("")
    setAttachments([])

    setShowChatInterface(true)
    setChatHistory([
      {
        type: "user",
        content: userMessage,
      },
    ])
    setIsLoading(true)

    try {
      const response = await client.api.chats.$post({
        json: {
          message: userMessage,
          streaming: true,
          attachments: currentAttachments.map((att) => ({ url: att.dataUrl })),
        },
      })

      if (!response.ok) {
        let errorMessage =
          "Sorry, there was an error processing your message. Please try again."
        try {
          const errorData = (await response.json()) as Record<string, unknown>
          if ("message" in errorData && typeof errorData.message === "string") {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              "You have exceeded your maximum number of messages for the day. Please try again later."
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
          if (response.status === 429) {
            errorMessage =
              "You have exceeded your maximum number of messages for the day. Please try again later."
          }
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error("No response body for streaming")
      }

      setIsLoading(false)
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
    } catch (error) {
      console.error("Error creating chat:", error)
      setIsLoading(false)
      setIsStreaming(false)

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, there was an error processing your message. Please try again."

      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: errorMessage,
        },
      ])
    }
  }

  const handleChatData = async (chatData: unknown) => {
    const data = chatData as { id?: string; object?: string }
    if (data.id) {
      if (!currentChatId || data.object === "chat") {
        setCurrentChatId(data.id)
        setCurrentChat({ id: data.id })

        window.history.pushState(null, "", `/chats/${data.id}`)
      }

      if (!currentChatId) {
        try {
          await client.api.chats.ownership.$post({
            json: { chatId: data.id },
          })
        } catch (error) {
          console.error("Failed to create chat ownership:", error)
        }
      }
    }
  }

  const handleStreamingComplete = async (finalContent: MessageBinaryFormat) => {
    setIsLoading(false)
    setIsStreaming(false)

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

    setCurrentChat((prevCurrentChat) => {
      if (prevCurrentChat?.id) {
        client.api.chats[":id"]
          .$get({
            param: { id: prevCurrentChat.id },
          })
          .then((response) => {
            if (response.ok) {
              return response.json()
            }
            console.warn("Failed to fetch chat details:", response.status)
            return null
          })
          .then((chatDetails) => {
            if (chatDetails && !("error" in chatDetails)) {
              const details = chatDetails as {
                latestVersion?: { demoUrl?: string }
                demo?: string
              }
              const demoUrl = details.latestVersion?.demoUrl || details.demo

              if (demoUrl) {
                setCurrentChat((prev) =>
                  prev ? { ...prev, demo: demoUrl } : null,
                )
                if (window.innerWidth < 768) {
                  setActivePanel("preview")
                }
              }
            }
          })
          .catch((error) => {
            console.error("Error fetching demo URL:", error)
          })
      }

      return prevCurrentChat
    })
  }

  const handleChatSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || isLoading || !currentChatId) return

    const userMessage = message.trim()
    setMessage("")
    setIsLoading(true)

    setChatHistory((prev) => [...prev, { type: "user", content: userMessage }])

    try {
      const response = await client.api.chats[":id"].message.$post({
        param: { id: currentChatId },
        json: {
          message: userMessage,
          streaming: true,
        },
      })

      if (!response.ok) {
        let errorMessage =
          "Sorry, there was an error processing your message. Please try again."
        try {
          const errorData = (await response.json()) as Record<string, unknown>
          if ("message" in errorData && typeof errorData.message === "string") {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              "You have exceeded your maximum number of messages for the day. Please try again later."
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
          if (response.status === 429) {
            errorMessage =
              "You have exceeded your maximum number of messages for the day. Please try again later."
          }
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error("No response body for streaming")
      }

      setIsLoading(false)
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
    } catch (error) {
      console.error("Error:", error)

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, there was an error processing your message. Please try again."

      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: errorMessage,
        },
      ])
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  if (showChatInterface) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-black">
        <Suspense fallback={null}>
          <SearchParamsHandler onReset={handleReset} />
        </Suspense>

        <ResizableLayout
          className="min-h-0 flex-1"
          singlePanelMode={false}
          activePanel={activePanel === "chat" ? "left" : "right"}
          leftPanel={
            <div className="flex h-full flex-col">
              <ChatHeader />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ChatMessages
                  chatHistory={chatHistory}
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  currentChat={currentChat}
                  onStreamingComplete={handleStreamingComplete}
                  onChatData={handleChatData}
                  onStreamingStarted={() => setIsLoading(false)}
                />
              </div>

              <ChatInput
                message={message}
                setMessage={setMessage}
                onSubmit={handleChatSendMessage}
                isLoading={isLoading}
                showSuggestions={false}
              />
            </div>
          }
          rightPanel={
            <PreviewPanel
              currentChat={currentChat}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              refreshKey={refreshKey}
              setRefreshKey={setRefreshKey}
            />
          }
        />

        <div className="flex-shrink-0 md:hidden">
          <BottomToolbar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            hasPreview={!!currentChat}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-black">
      <Suspense fallback={null}>
        <SearchParamsHandler onReset={handleReset} />
      </Suspense>

      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center md:mb-12">
            <h2 className="mb-4 font-bold text-2xl text-gray-900 sm:text-3xl md:text-4xl dark:text-white">
              What can we build together?
            </h2>
          </div>

          <div className="mx-auto max-w-2xl">
            <PromptInput
              onSubmit={handleSendMessage}
              className="relative w-full"
              onImageDrop={handleImageFiles}
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PromptInputImagePreview
                attachments={attachments}
                onRemove={handleRemoveAttachment}
              />
              <PromptInputTextarea
                ref={textareaRef}
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                placeholder="Describe what you want to build..."
                className="min-h-[80px] text-base"
                disabled={isLoading}
              />
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputImageButton
                    onImageSelect={handleImageFiles}
                    disabled={isLoading}
                  />
                </PromptInputTools>
                <PromptInputTools>
                  <PromptInputMicButton
                    onTranscript={(transcript) => {
                      setMessage(
                        (prev) => prev + (prev ? " " : "") + transcript,
                      )
                    }}
                    onError={(error) => {
                      console.error("Speech recognition error:", error)
                    }}
                    disabled={isLoading}
                  />
                  <PromptInputSubmit
                    disabled={!message.trim() || isLoading}
                    status={isLoading ? "streaming" : "ready"}
                  />
                </PromptInputTools>
              </PromptInputToolbar>
            </PromptInput>
          </div>

          <div className="mx-auto mt-4 max-w-2xl">
            <Suggestions>
              <Suggestion
                onClick={() => {
                  setMessage("Landing page")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Landing page"
              />
              <Suggestion
                onClick={() => {
                  setMessage("Todo app")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Todo app"
              />
              <Suggestion
                onClick={() => {
                  setMessage("Dashboard")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Dashboard"
              />
              <Suggestion
                onClick={() => {
                  setMessage("Blog")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Blog"
              />
              <Suggestion
                onClick={() => {
                  setMessage("E-commerce")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="E-commerce"
              />
              <Suggestion
                onClick={() => {
                  setMessage("Portfolio")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Portfolio"
              />
              <Suggestion
                onClick={() => {
                  setMessage("Chat app")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Chat app"
              />
              <Suggestion
                onClick={() => {
                  setMessage("Calculator")
                  setTimeout(() => {
                    const form = textareaRef.current?.form
                    if (form) {
                      form.requestSubmit()
                    }
                  }, 0)
                }}
                suggestion="Calculator"
              />
            </Suggestions>
          </div>

          <div className="mt-8 text-center text-muted-foreground text-sm md:mt-16">
            <p>
              Powered by{" "}
              <Link
                href="https://v0-sdk.dev"
                className="text-foreground hover:underline"
              >
                v0 SDK
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
