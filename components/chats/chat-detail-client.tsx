"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  clearPromptFromStorage,
  type ImageAttachment,
} from "@/components/ai-elements/prompt-input"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { PreviewPanel } from "@/components/chat/preview-panel"
import { BottomToolbar } from "@/components/shared/bottom-toolbar"
import { ResizableLayout } from "@/components/shared/resizable-layout"
import { useStreaming } from "@/contexts/streaming-context"
import { useChat } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"

export function ChatDetailClient() {
  const params = useParams()
  const chatId = params.chatId as string
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [activePanel, setActivePanel] = useState<"chat" | "preview">("chat")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const _streamingContext = useStreaming()
  const chatState = useChat(chatId)

  const handleSubmitWithAttachments = (
    e: React.FormEvent<HTMLFormElement>,
    attachmentUrls?: Array<{ url: string }>,
  ) => {
    clearPromptFromStorage()
    setAttachments([])
    return chatState.handleSendMessage(e, attachmentUrls)
  }

  // Handle fullscreen keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen])

  useEffect(() => {
    if (textareaRef.current && !chatState.isLoadingChat) {
      textareaRef.current.focus()
    }
  }, [chatState.isLoadingChat])

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-black",
        isFullscreen && "fixed inset-0 z-50",
      )}
    >
      <ResizableLayout
        className="min-h-0 flex-1"
        singlePanelMode={false}
        activePanel={activePanel === "chat" ? "left" : "right"}
        leftPanel={
          <div className="flex h-full flex-col">
            <ChatHeader />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatMessages
                chatHistory={chatState.chatHistory}
                isLoading={chatState.isLoading}
                isStreaming={chatState.isStreaming}
                currentChat={chatState.currentChat || null}
                onStreamingComplete={chatState.handleStreamingComplete}
                onChatData={chatState.handleChatData}
                onStreamingStarted={() => chatState.setIsLoading(false)}
              />
            </div>

            <ChatInput
              message={chatState.message}
              setMessage={chatState.setMessage}
              onSubmit={handleSubmitWithAttachments}
              isLoading={chatState.isLoading}
              showSuggestions={false}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              textareaRef={textareaRef}
            />
          </div>
        }
        rightPanel={
          <PreviewPanel
            currentChat={chatState.currentChat || null}
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
          hasPreview={!!chatState.currentChat}
        />
      </div>
    </div>
  )
}
