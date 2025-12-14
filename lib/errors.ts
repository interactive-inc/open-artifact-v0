export type ErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'offline'

export type Surface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'vote'
  | 'document'
  | 'suggestions'

export type ErrorCode = `${ErrorType}:${Surface}`

export type ErrorVisibility = 'response' | 'log' | 'none'

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  vote: 'response',
  document: 'response',
  suggestions: 'response',
}

const errorCodeToStatusCode: Record<ErrorType, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limit: 429,
  offline: 503,
}

const errorCodeToMessage: Record<string, string> = {
  'bad_request:api': "The request couldn't be processed. Please check your input and try again.",
  'unauthorized:auth': 'You need to sign in before continuing.',
  'forbidden:auth': 'Your account does not have access to this feature.',
  'rate_limit:chat': 'You have exceeded your maximum number of messages for the day. Please try again later.',
  'not_found:chat': 'The requested chat was not found. Please check the chat ID and try again.',
  'forbidden:chat': 'This chat belongs to another user. Please check the chat ID and try again.',
  'unauthorized:chat': 'You need to sign in to view this chat. Please sign in and try again.',
  'offline:chat': "We're having trouble sending your message. Please check your internet connection and try again.",
  'not_found:document': 'The requested document was not found. Please check the document ID and try again.',
  'forbidden:document': 'This document belongs to another user. Please check the document ID and try again.',
  'unauthorized:document': 'You need to sign in to view this document. Please sign in and try again.',
  'bad_request:document': 'The request to create or update the document was invalid. Please check your input and try again.',
}

type ChatSDKErrorProps = {
  readonly type: ErrorType
  readonly surface: Surface
  readonly statusCode: number
  readonly errorMessage: string
  readonly errorCause: string | undefined
}

/**
 * ChatSDKError
 */
export class ChatSDKError extends Error {
  private readonly props: ChatSDKErrorProps

  constructor(errorCode: ErrorCode, cause?: string) {
    super()

    const parts = errorCode.split(':')
    const errorType = parts[0] as ErrorType
    const errorSurface = parts[1] as Surface

    this.props = {
      type: errorType,
      surface: errorSurface,
      statusCode: errorCodeToStatusCode[errorType] || 500,
      errorMessage: getMessageByErrorCode(errorCode),
      errorCause: cause,
    }

    this.cause = cause
    this.message = this.props.errorMessage

    Object.freeze(this)
  }

  get type() {
    return this.props.type
  }

  get surface() {
    return this.props.surface
  }

  get statusCode() {
    return this.props.statusCode
  }

  toResponse() {
    const code: ErrorCode = `${this.props.type}:${this.props.surface}`
    const visibility = visibilityBySurface[this.props.surface]

    if (visibility === 'log') {
      console.error({
        code,
        message: this.props.errorMessage,
        cause: this.props.errorCause,
      })

      return Response.json(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: this.props.statusCode },
      )
    }

    return Response.json(
      { code, message: this.props.errorMessage, cause: this.props.errorCause },
      { status: this.props.statusCode },
    )
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes('database')) {
    return 'An error occurred while executing a database query.'
  }

  const message = errorCodeToMessage[errorCode]
  if (message) {
    return message
  }

  return 'Something went wrong. Please try again later.'
}
