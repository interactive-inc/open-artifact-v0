'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { BottomToolbar } from '@/components/shared/bottom-toolbar'
import { useChat } from '@/hooks/use-chat'
import { useStreaming } from '@/contexts/streaming-context'
import { cn } from '@/lib/utils'
import {
  type ImageAttachment,
  clearPromptFromStorage,
} from '@/components/ai-elements/prompt-input'

export function ChatDetailClient() {
  const params = useParams()
  const chatId = params.chatId as string
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [activePanel, setActivePanel] = useState<'chat' | 'preview'>('chat')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const streamingContext = useStreaming()
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
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  useEffect(() => {
    if (textareaRef.current && !chatState.isLoadingChat) {
      textareaRef.current.focus()
    }
  }, [chatState.isLoadingChat])

  return (
    <div
      className={cn(
        'h-full bg-gray-50 dark:bg-black flex flex-col overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50',
      )}
    >
      <ResizableLayout
        className="flex-1 min-h-0"
        singlePanelMode={false}
        activePanel={activePanel === 'chat' ? 'left' : 'right'}
        leftPanel={
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ChatMessages
                chatHistory={chatState.chatHistory}
                isLoading={chatState.isLoading}
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

      <div className="md:hidden flex-shrink-0">
        <BottomToolbar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          hasPreview={!!chatState.currentChat}
        />
      </div>
    </div>
  )
}
