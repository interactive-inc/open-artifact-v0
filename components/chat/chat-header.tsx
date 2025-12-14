'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatHeader() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button variant="ghost" size="icon" asChild className="size-8">
        <Link href="/?reset=true">
          <Home className="size-4" />
        </Link>
      </Button>
      <span className="text-sm font-medium text-muted-foreground">Chat</span>
    </div>
  )
}
