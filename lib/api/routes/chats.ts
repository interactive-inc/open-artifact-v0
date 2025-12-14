import { zValidator } from "@hono/zod-validator"
import { HTTPException } from "hono/http-exception"
import { type ChatDetail, createClient } from "v0-sdk"
import { z } from "zod"
import {
  createAnonymousChatLog,
  createChatOwnership,
  deleteChatOwnership,
  getChatCountByIP,
  getChatCountByUserId,
  getChatIdsByUserId,
  getChatOwnership,
} from "@/lib/db/queries"
import {
  anonymousEntitlements,
  entitlementsByUserType,
} from "@/lib/entitlements"
import { factory } from "../factory"
import { authMiddleware } from "../middleware/auth"

const v0 = createClient(
  process.env.V0_API_URL ? { baseUrl: process.env.V0_API_URL } : {},
)

const createChatSchema = z.object({
  message: z.string().min(1),
  streaming: z.boolean().optional(),
  attachments: z.array(z.object({ url: z.string() })).optional(),
})

const sendMessageSchema = z.object({
  message: z.string().min(1),
  streaming: z.boolean().optional(),
  attachments: z.array(z.object({ url: z.string() })).optional(),
})

const visibilitySchema = z.object({
  privacy: z.enum(["public", "private", "team", "team-edit", "unlisted"]),
})

const ownershipSchema = z.object({
  chatId: z.string().min(1),
})

function getClientIP(c: any): string {
  const forwarded = c.req.header("x-forwarded-for")
  const realIP = c.req.header("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return "unknown"
}

const listChatsHandlers = factory.createHandlers(async (c) => {
  const user = c.get("user")

  if (!user) {
    return c.json({ data: [] as ChatDetail[] })
  }

  const userChatIds = await getChatIdsByUserId({ userId: user.id })

  if (userChatIds.length === 0) {
    return c.json({ data: [] as ChatDetail[] })
  }

  const allChats = await v0.chats.find()
  const userChats =
    allChats.data?.filter((chat) => userChatIds.includes(chat.id)) || []

  return c.json({ data: userChats })
})

const createChatHandlers = factory.createHandlers(
  zValidator("json", createChatSchema),
  async (c) => {
    const user = c.get("user")
    const body = c.req.valid("json")

    if (user) {
      const chatCount = await getChatCountByUserId({
        userId: user.id,
        differenceInHours: 24,
      })

      if (chatCount >= entitlementsByUserType[user.type].maxMessagesPerDay) {
        throw new HTTPException(429, {
          message:
            "You have exceeded your maximum number of messages for the day.",
        })
      }
    } else {
      const clientIP = getClientIP(c)
      const chatCount = await getChatCountByIP({
        ipAddress: clientIP,
        differenceInHours: 24,
      })

      if (chatCount >= anonymousEntitlements.maxMessagesPerDay) {
        throw new HTTPException(429, {
          message:
            "You have exceeded your maximum number of messages for the day.",
        })
      }
    }

    if (body.streaming) {
      const chatStream = await v0.chats.create({
        message: body.message,
        responseMode: "experimental_stream",
        ...(body.attachments &&
          body.attachments.length > 0 && { attachments: body.attachments }),
      })

      return new Response(chatStream as ReadableStream<Uint8Array>, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    const chat = (await v0.chats.create({
      message: body.message,
      responseMode: "sync",
      ...(body.attachments &&
        body.attachments.length > 0 && { attachments: body.attachments }),
    })) as ChatDetail

    if (chat.id) {
      if (user) {
        await createChatOwnership({ v0ChatId: chat.id, userId: user.id })
      } else {
        const clientIP = getClientIP(c)
        await createAnonymousChatLog({ ipAddress: clientIP, v0ChatId: chat.id })
      }
    }

    return c.json({
      id: chat.id,
      demo: chat.demo,
      messages: chat.messages?.map((msg) => ({
        ...msg,
        experimental_content: (msg as any).experimental_content,
      })),
    })
  },
)

const createOwnershipHandlers = factory.createHandlers(
  zValidator("json", ownershipSchema),
  async (c) => {
    const user = c.get("user")
    const body = c.req.valid("json")

    if (user) {
      await createChatOwnership({ v0ChatId: body.chatId, userId: user.id })
    } else {
      const clientIP = getClientIP(c)
      await createAnonymousChatLog({
        ipAddress: clientIP,
        v0ChatId: body.chatId,
      })
    }

    return c.json({ success: true })
  },
)

const getChatHandlers = factory.createHandlers(async (c) => {
  const user = c.get("user")
  const chatId = c.req.param("id")

  if (!chatId) {
    throw new HTTPException(400, { message: "Chat ID is required" })
  }

  if (user) {
    const ownership = await getChatOwnership({ v0ChatId: chatId })

    if (!ownership) {
      throw new HTTPException(404, { message: "Chat not found" })
    }

    if (ownership.user_id !== user.id) {
      throw new HTTPException(403, { message: "Forbidden" })
    }
  }

  const chatDetails = await v0.chats.getById({ chatId })

  return c.json(chatDetails)
})

const sendMessageHandlers = factory.createHandlers(
  zValidator("json", sendMessageSchema),
  async (c) => {
    const user = c.get("user")
    const chatId = c.req.param("id")
    const body = c.req.valid("json")

    if (!chatId) {
      throw new HTTPException(400, { message: "Chat ID is required" })
    }

    if (user) {
      const chatCount = await getChatCountByUserId({
        userId: user.id,
        differenceInHours: 24,
      })

      if (chatCount >= entitlementsByUserType[user.type].maxMessagesPerDay) {
        throw new HTTPException(429, {
          message:
            "You have exceeded your maximum number of messages for the day.",
        })
      }
    } else {
      const clientIP = getClientIP(c)
      const chatCount = await getChatCountByIP({
        ipAddress: clientIP,
        differenceInHours: 24,
      })

      if (chatCount >= anonymousEntitlements.maxMessagesPerDay) {
        throw new HTTPException(429, {
          message:
            "You have exceeded your maximum number of messages for the day.",
        })
      }
    }

    if (body.streaming) {
      const chatStream = await v0.chats.sendMessage({
        chatId,
        message: body.message,
        responseMode: "experimental_stream",
        ...(body.attachments &&
          body.attachments.length > 0 && { attachments: body.attachments }),
      })

      return new Response(chatStream as ReadableStream<Uint8Array>, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    const chat = (await v0.chats.sendMessage({
      chatId,
      message: body.message,
      ...(body.attachments &&
        body.attachments.length > 0 && { attachments: body.attachments }),
    })) as ChatDetail

    return c.json({
      id: chat.id,
      demo: chat.demo,
      messages: chat.messages?.map((msg) => ({
        ...msg,
        experimental_content: (msg as any).experimental_content,
      })),
    })
  },
)

const deleteChatHandlers = factory.createHandlers(async (c) => {
  const user = c.get("user")
  const chatId = c.req.param("id")

  if (!chatId) {
    throw new HTTPException(400, { message: "Chat ID is required" })
  }

  if (!user) {
    throw new HTTPException(401, { message: "Authentication required" })
  }

  const ownership = await getChatOwnership({ v0ChatId: chatId })

  if (!ownership || ownership.user_id !== user.id) {
    throw new HTTPException(404, { message: "Chat not found or access denied" })
  }

  const result = await v0.chats.delete({ chatId })
  await deleteChatOwnership({ v0ChatId: chatId })

  return c.json(result)
})

const forkChatHandlers = factory.createHandlers(async (c) => {
  const chatId = c.req.param("id")

  if (!chatId) {
    throw new HTTPException(400, { message: "Chat ID is required" })
  }

  const forkedChat = await v0.chats.fork({
    chatId,
    privacy: "private",
  })

  return c.json(forkedChat)
})

const updateVisibilityHandlers = factory.createHandlers(
  zValidator("json", visibilitySchema),
  async (c) => {
    const user = c.get("user")
    const chatId = c.req.param("id")
    const body = c.req.valid("json")

    if (!chatId) {
      throw new HTTPException(400, { message: "Chat ID is required" })
    }

    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" })
    }

    const ownership = await getChatOwnership({ v0ChatId: chatId })

    if (!ownership || ownership.user_id !== user.id) {
      throw new HTTPException(404, {
        message: "Chat not found or access denied",
      })
    }

    const updatedChat = await v0.chats.update({
      chatId,
      privacy: body.privacy,
    })

    return c.json(updatedChat)
  },
)

export {
  authMiddleware,
  listChatsHandlers,
  createChatHandlers,
  createOwnershipHandlers,
  getChatHandlers,
  sendMessageHandlers,
  deleteChatHandlers,
  forkChatHandlers,
  updateVisibilityHandlers,
}
