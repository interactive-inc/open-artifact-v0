import { useCallback, useEffect, useState } from "react"
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

type Props = {
  message: string
  setMessage: (message: string) => void
  onSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    attachments?: Array<{ url: string }>,
  ) => void
  isLoading: boolean
  showSuggestions: boolean
  attachments?: ImageAttachment[]
  onAttachmentsChange?: (attachments: ImageAttachment[]) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatInput(props: Props) {
  const attachments = props.attachments || []
  const [isDragOver, setIsDragOver] = useState(false)

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (!props.onAttachmentsChange) return

      try {
        const newAttachments = await Promise.all(
          files.map((file) => createImageAttachment(file)),
        )
        props.onAttachmentsChange([...attachments, ...newAttachments])
      } catch (error) {
        console.error("Error processing image files:", error)
      }
    },
    [attachments, props.onAttachmentsChange],
  )

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      if (!props.onAttachmentsChange) return
      props.onAttachmentsChange(attachments.filter((att) => att.id !== id))
    },
    [attachments, props.onAttachmentsChange],
  )

  const handleDragOver = useCallback(() => {
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(() => {
    setIsDragOver(false)
  }, [])

  // Save to sessionStorage when message or attachments change
  useEffect(() => {
    if (props.message.trim() || attachments.length > 0) {
      savePromptToStorage(props.message, attachments)
    } else {
      // Clear sessionStorage if both message and attachments are empty
      clearPromptFromStorage()
    }
  }, [props.message, attachments])

  // Restore from sessionStorage on mount (only if no existing data)
  useEffect(() => {
    if (!props.message && attachments.length === 0) {
      const storedData = loadPromptFromStorage()
      if (storedData) {
        props.setMessage(storedData.message)
        if (storedData.attachments.length > 0 && props.onAttachmentsChange) {
          const restoredAttachments = storedData.attachments.map(
            createImageAttachmentFromStored,
          )
          props.onAttachmentsChange(restoredAttachments)
        }
      }
    }
  }, [props.message, attachments, props.setMessage, props.onAttachmentsChange])

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      // Clear sessionStorage immediately upon submission
      clearPromptFromStorage()

      const attachmentUrls = attachments.map((att) => ({ url: att.dataUrl }))
      props.onSubmit(e, attachmentUrls.length > 0 ? attachmentUrls : undefined)
    },
    [props.onSubmit, attachments],
  )

  return (
    <div className="p-2">
      <div className="flex gap-2">
        <PromptInput
          onSubmit={handleSubmit}
          className="relative mx-auto w-full max-w-2xl"
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
            ref={props.textareaRef}
            onChange={(e) => props.setMessage(e.target.value)}
            value={props.message}
            className="min-h-[60px]"
            placeholder="Continue the conversation..."
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputImageButton onImageSelect={handleImageFiles} />
            </PromptInputTools>
            <PromptInputTools>
              <PromptInputMicButton
                onTranscript={(transcript) => {
                  props.setMessage(
                    props.message + (props.message ? " " : "") + transcript,
                  )
                }}
                onError={(error) => {
                  console.error("Speech recognition error:", error)
                }}
              />
              <PromptInputSubmit
                disabled={!props.message}
                status={props.isLoading ? "streaming" : "ready"}
              />
            </PromptInputTools>
          </PromptInputToolbar>
        </PromptInput>
      </div>
      {props.showSuggestions && (
        <div className="mx-auto mt-2 max-w-2xl">
          <Suggestions>
            <Suggestion
              onClick={() => {
                props.setMessage("Landing page")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Landing page"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("Todo app")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Todo app"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("Dashboard")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Dashboard"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("Blog")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Blog"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("E-commerce")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="E-commerce"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("Portfolio")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Portfolio"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("Chat app")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Chat app"
            />
            <Suggestion
              onClick={() => {
                props.setMessage("Calculator")
                // Submit after setting message
                setTimeout(() => {
                  const form = props.textareaRef?.current?.form
                  if (form) {
                    form.requestSubmit()
                  }
                }, 0)
              }}
              suggestion="Calculator"
            />
          </Suggestions>
        </div>
      )}
    </div>
  )
}
