import React, { useRef, useEffect } from 'react'
import type { MessageBinaryFormat } from '@v0-sdk/react'
import { Message } from '@/components/ai-elements/message'
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import { MessageRenderer } from '@/components/message-renderer'
import { sharedComponents } from '@/components/shared-components'
import { StreamingMessage } from '@v0-sdk/react'
import { cn } from '@/lib/utils'

type ChatMessage = {
  type: 'user' | 'assistant'
  content: string | MessageBinaryFormat
  isStreaming?: boolean
  stream?: ReadableStream<Uint8Array> | null
}

type Chat = {
  id: string
  demo?: string
  url?: string
}

type Props = {
  chatHistory: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  currentChat: Chat | null
  onStreamingComplete: (finalContent: MessageBinaryFormat) => void
  onChatData: (chatData: Record<string, unknown>) => void
  onStreamingStarted?: () => void
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
}

export function ChatMessages(props: Props) {
  const streamingStartedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLocked = props.isLoading || props.isStreaming

  useEffect(() => {
    if (props.isLoading) {
      streamingStartedRef.current = false
    }
  }, [props.isLoading])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [props.chatHistory, props.isLoading])

  if (props.chatHistory.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <div>
          </div>
        </ConversationContent>
      </Conversation>
    )
  }

  return (
    <div className={cn('relative', isLocked && 'pointer-events-none select-none')}>
      <Conversation>
        <ConversationContent>
          {props.chatHistory.map((msg, index) => (
            <Message from={msg.type} key={index}>
              {msg.isStreaming && msg.stream ? (
                <StreamingMessage
                  stream={msg.stream}
                  messageId={`msg-${index}`}
                  role={msg.type}
                  onComplete={props.onStreamingComplete}
                  onChatData={props.onChatData}
                  onChunk={() => {
                    if (props.onStreamingStarted && !streamingStartedRef.current) {
                      streamingStartedRef.current = true
                      props.onStreamingStarted()
                    }
                    if (messagesEndRef.current) {
                      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  onError={(error) => console.error('Streaming error:', error)}
                  components={sharedComponents}
                  showLoadingIndicator={false}
                />
              ) : (
                <MessageRenderer
                  content={msg.content}
                  role={msg.type}
                  messageId={`msg-${index}`}
                />
              )}
            </Message>
          ))}
          {props.isLoading && (
            <div className="flex justify-center py-4">
              <Loader size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </ConversationContent>
      </Conversation>
    </div>
  )
}
