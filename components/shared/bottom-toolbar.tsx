'use client'

import { MessageSquare, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BottomToolbarProps = {
  activePanel: 'chat' | 'preview'
  onPanelChange: (panel: 'chat' | 'preview') => void
  hasPreview: boolean
}

export function BottomToolbar(props: BottomToolbarProps) {
  return (
    <div className="bg-white dark:bg-black py-4 px-2">
      <div className="flex items-center justify-center max-w-xs mx-auto">
        <div className="flex bg-secondary rounded-lg p-1 w-full">
          <button
            onClick={() => props.onPanelChange('chat')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-8 text-xs font-medium rounded-md transition-all duration-200',
              props.activePanel === 'chat'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessageSquare className="h-3 w-3" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => props.onPanelChange('preview')}
            disabled={!props.hasPreview}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-8 text-xs font-medium rounded-md transition-all duration-200',
              props.activePanel === 'preview'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
              !props.hasPreview &&
                'opacity-50 cursor-not-allowed hover:text-muted-foreground',
            )}
          >
            <Monitor className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </div>
  )
}
