"use client"

import Link from "next/link"
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSignIn, useSignUp } from "@/hooks/api/use-auth"

type Props = {
  type: "signin" | "signup"
}

export function AuthForm(props: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const signInMutation = useSignIn()
  const signUpMutation = useSignUp()

  const mutation = props.type === "signin" ? signInMutation : signUpMutation
  const isPending = mutation.isPending
  const error = mutation.error

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    mutation.mutate({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          required
          autoFocus
          className="w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full"
          minLength={props.type === "signup" ? 6 : 1}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error.message}</div>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? props.type === "signin"
            ? "Signing in..."
            : "Creating account..."
          : props.type === "signin"
            ? "Sign In"
            : "Create Account"}
      </Button>

      <div className="text-center text-muted-foreground text-sm">
        {props.type === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </div>
    </form>
  )
}
