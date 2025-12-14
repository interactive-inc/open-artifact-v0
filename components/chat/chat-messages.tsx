import React, { useRef, useEffect } from 'react'
import type { MessageBinaryFormat } from '@v0-sdk/react'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import { MessageRenderer } from '@/components/message-renderer'
import { sharedComponents } from '@/components/shared-components'
import { StreamingMessage } from '@v0-sdk/react'

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

type ChatMessagesProps = {
  chatHistory: ChatMessage[]
  isLoading: boolean
  currentChat: Chat | null
  onStreamingComplete: (finalContent: MessageBinaryFormat) => void
  onChatData: (chatData: Record<string, unknown>) => void
  onStreamingStarted?: () => void
}

export function ChatMessages(props: ChatMessagesProps) {
  const streamingStartedRef = useRef(false)

  // Reset the streaming started flag when a new message starts loading
  useEffect(() => {
    if (props.isLoading) {
      streamingStartedRef.current = false
    }
  }, [props.isLoading])

  if (props.chatHistory.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <div>
            {/* Empty conversation - messages will appear here when they load */}
          </div>
        </ConversationContent>
      </Conversation>
    )
  }

  return (
    <>
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
                  onChunk={(chunk) => {
                    // Hide external loader once we start receiving content (only once)
                    if (props.onStreamingStarted && !streamingStartedRef.current) {
                      streamingStartedRef.current = true
                      props.onStreamingStarted()
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
        </ConversationContent>
      </Conversation>
    </>
  )
}
