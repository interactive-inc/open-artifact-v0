'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ensureUserExists } from '@/lib/db/queries'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

type ActionResult = {
  type: 'error' | 'success'
  message: string
}

/**
 * Sign in with email and password
 */
export async function signInAction(
  previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const validationResult = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validationResult.success) {
    return {
      type: 'error',
      message: validationResult.error.issues[0].message,
    }
  }

  const supabase = await createClient()

  const { error, data } = await supabase.auth.signInWithPassword({
    email: validationResult.data.email,
    password: validationResult.data.password,
  })

  if (error) {
    console.error('Supabase signIn error:', error.message, error.code)
    return {
      type: 'error',
      message: error.message,
    }
  }

  if (!data.session) {
    console.error('No session returned after signIn')
    return {
      type: 'error',
      message: 'Failed to create session. Please try again.',
    }
  }

  // Sync user to local database
  await ensureUserExists({
    id: data.user.id,
    email: data.user.email ?? '',
  })

  revalidatePath('/')
  redirect('/')
}

/**
 * Sign up with email and password
 */
export async function signUpAction(
  previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const validationResult = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validationResult.success) {
    return {
      type: 'error',
      message: validationResult.error.issues[0].message,
    }
  }

  const supabase = await createClient()

  const { error, data } = await supabase.auth.signUp({
    email: validationResult.data.email,
    password: validationResult.data.password,
  })

  if (error) {
    return {
      type: 'error',
      message: error.message,
    }
  }

  // Sync user to local database if user was created
  if (data.user) {
    await ensureUserExists({
      id: data.user.id,
      email: data.user.email ?? '',
    })
  }

  revalidatePath('/')
  redirect('/')
}

/**
 * Sign out current user
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}
