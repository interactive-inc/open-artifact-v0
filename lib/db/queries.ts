import 'server-only'

import { and, count, desc, eq, gte } from 'drizzle-orm'

import { users, chat_ownerships, anonymous_chat_logs } from './schema'
import db from './connection'

function getDb() {
  if (!db) {
    throw new Error('Database connection not available')
  }
  return db
}

type EnsureUserExistsProps = {
  id: string
  email: string
}

/**
 * Sync Supabase user to local database
 */
export async function ensureUserExists(props: EnsureUserExistsProps) {
  try {
    return await getDb()
      .insert(users)
      .values({ id: props.id, email: props.email })
      .onConflictDoNothing({ target: users.id })
  } catch (error) {
    console.error('Failed to ensure user exists in database')
    throw error
  }
}

type CreateChatOwnershipProps = {
  v0ChatId: string
  userId: string
}

/**
 * Create chat ownership
 */
export async function createChatOwnership(props: CreateChatOwnershipProps) {
  try {
    return await getDb()
      .insert(chat_ownerships)
      .values({
        v0_chat_id: props.v0ChatId,
        user_id: props.userId,
      })
      .onConflictDoNothing({ target: chat_ownerships.v0_chat_id })
  } catch (error) {
    console.error('Failed to create chat ownership in database')
    throw error
  }
}

type GetChatOwnershipProps = {
  v0ChatId: string
}

/**
 * Get chat ownership
 */
export async function getChatOwnership(props: GetChatOwnershipProps) {
  try {
    const results = await getDb()
      .select()
      .from(chat_ownerships)
      .where(eq(chat_ownerships.v0_chat_id, props.v0ChatId))
    return results[0]
  } catch (error) {
    console.error('Failed to get chat ownership from database')
    throw error
  }
}

type GetChatIdsByUserIdProps = {
  userId: string
}

/**
 * Get chat IDs by user ID
 */
export async function getChatIdsByUserId(props: GetChatIdsByUserIdProps): Promise<string[]> {
  try {
    const ownerships = await getDb()
      .select({ v0ChatId: chat_ownerships.v0_chat_id })
      .from(chat_ownerships)
      .where(eq(chat_ownerships.user_id, props.userId))
      .orderBy(desc(chat_ownerships.created_at))

    const result: string[] = []
    for (const ownership of ownerships) {
      result.push(ownership.v0ChatId)
    }
    return result
  } catch (error) {
    console.error('Failed to get chat IDs by user from database')
    throw error
  }
}

type DeleteChatOwnershipProps = {
  v0ChatId: string
}

/**
 * Delete chat ownership
 */
export async function deleteChatOwnership(props: DeleteChatOwnershipProps) {
  try {
    return await getDb()
      .delete(chat_ownerships)
      .where(eq(chat_ownerships.v0_chat_id, props.v0ChatId))
  } catch (error) {
    console.error('Failed to delete chat ownership from database')
    throw error
  }
}

type GetChatCountByUserIdProps = {
  userId: string
  differenceInHours: number
}

/**
 * Get chat count by user ID for rate limiting
 */
export async function getChatCountByUserId(props: GetChatCountByUserIdProps): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - props.differenceInHours * 60 * 60 * 1000)

    const results = await getDb()
      .select({ count: count(chat_ownerships.id) })
      .from(chat_ownerships)
      .where(
        and(
          eq(chat_ownerships.user_id, props.userId),
          gte(chat_ownerships.created_at, hoursAgo),
        ),
      )

    const stats = results[0]
    return stats?.count || 0
  } catch (error) {
    console.error('Failed to get chat count by user from database')
    throw error
  }
}

type GetChatCountByIPProps = {
  ipAddress: string
  differenceInHours: number
}

/**
 * Get chat count by IP for rate limiting
 */
export async function getChatCountByIP(props: GetChatCountByIPProps): Promise<number> {
  try {
    const hoursAgo = new Date(Date.now() - props.differenceInHours * 60 * 60 * 1000)

    const results = await getDb()
      .select({ count: count(anonymous_chat_logs.id) })
      .from(anonymous_chat_logs)
      .where(
        and(
          eq(anonymous_chat_logs.ip_address, props.ipAddress),
          gte(anonymous_chat_logs.created_at, hoursAgo),
        ),
      )

    const stats = results[0]
    return stats?.count || 0
  } catch (error) {
    console.error('Failed to get chat count by IP from database')
    throw error
  }
}

type CreateAnonymousChatLogProps = {
  ipAddress: string
  v0ChatId: string
}

/**
 * Create anonymous chat log
 */
export async function createAnonymousChatLog(props: CreateAnonymousChatLogProps) {
  try {
    return await getDb().insert(anonymous_chat_logs).values({
      ip_address: props.ipAddress,
      v0_chat_id: props.v0ChatId,
    })
  } catch (error) {
    console.error('Failed to create anonymous chat log in database')
    throw error
  }
}
