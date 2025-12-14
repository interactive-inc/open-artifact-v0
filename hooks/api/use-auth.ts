"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { client } from "@/lib/api/client"

export function useSignIn() {
  const router = useRouter()

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string
      password: string
    }) => {
      const response = await client.api.auth.signin.$post({
        json: { email, password },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error("message" in error ? error.message : "Sign in failed")
      }

      return response.json()
    },
    onSuccess: () => {
      router.push("/")
      router.refresh()
    },
  })
}

export function useSignUp() {
  const router = useRouter()

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string
      password: string
    }) => {
      const response = await client.api.auth.signup.$post({
        json: { email, password },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error("message" in error ? error.message : "Sign up failed")
      }

      return response.json()
    },
    onSuccess: () => {
      router.push("/")
      router.refresh()
    },
  })
}

export function useSignOut() {
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const response = await client.api.auth.signout.$post()

      if (!response.ok) {
        const error = await response.json()
        throw new Error("message" in error ? error.message : "Sign out failed")
      }

      return response.json()
    },
    onSuccess: () => {
      router.push("/login")
      router.refresh()
    },
  })
}
