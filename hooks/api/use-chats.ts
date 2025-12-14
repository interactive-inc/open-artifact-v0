'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/api/client'

export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: () => [...chatKeys.lists()] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
}

export function useChats() {
  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: async () => {
      const response = await client.api.chats.$get()

      if (!response.ok) {
        throw new Error('Failed to fetch chats')
      }

      const result = await response.json()

      if ('data' in result) {
        return result.data
      }

      return []
    },
  })
}

export function useChat(id: string | null) {
  return useQuery({
    queryKey: chatKeys.detail(id || ''),
    queryFn: async () => {
      const response = await client.api.chats[':id'].$get({
        param: { id: id! },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch chat')
      }

      return response.json()
    },
    enabled: !!id,
  })
}

export function useDeleteChat() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.chats[':id'].$delete({
        param: { id },
      })

      if (!response.ok) {
        throw new Error('Failed to delete chat')
      }

      return response.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.lists() })
      queryClient.removeQueries({ queryKey: chatKeys.detail(id) })
      router.push('/')
    },
  })
}

export function useForkChat() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.chats[':id'].fork.$post({
        param: { id },
      })

      if (!response.ok) {
        throw new Error('Failed to fork chat')
      }

      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.lists() })
      if ('id' in result && result.id) {
        router.push(`/chats/${result.id}`)
      }
    },
  })
}

export function useUpdateVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, privacy }: { id: string; privacy: 'public' | 'private' | 'team' | 'team-edit' | 'unlisted' }) => {
      const response = await client.api.chats[':id'].visibility.$patch({
        param: { id },
        json: { privacy },
      })

      if (!response.ok) {
        throw new Error('Failed to update visibility')
      }

      return response.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: chatKeys.lists() })
    },
  })
}

export function useCreateOwnership() {
  return useMutation({
    mutationFn: async (chatId: string) => {
      const response = await client.api.chats.ownership.$post({
        json: { chatId },
      })

      if (!response.ok) {
        throw new Error('Failed to create ownership')
      }

      return response.json()
    },
  })
}
