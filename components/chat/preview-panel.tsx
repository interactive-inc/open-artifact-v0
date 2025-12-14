import {
  WebPreview,
  WebPreviewBody,
} from '@/components/ai-elements/web-preview'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Maximize, Minimize, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Chat = {
  id: string
  demo?: string
  url?: string
}

type PreviewPanelProps = {
  currentChat: Chat | null
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  refreshKey: number
  setRefreshKey: (key: number | ((prev: number) => number)) => void
}

export function PreviewPanel({
  currentChat,
  isFullscreen,
  setIsFullscreen,
  refreshKey,
  setRefreshKey,
}: PreviewPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-50 bg-background p-0' : 'p-2',
      )}
    >
      <Card className="p-0 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-1.5">
            <Circle className="size-3 fill-red-500 text-red-500" />
            <Circle className="size-3 fill-yellow-500 text-yellow-500" />
            <Circle className="size-3 fill-green-500 text-green-500" />
          </div>
          <Input
            readOnly
            placeholder="Your app will appear here..."
            value={currentChat?.demo || ''}
            className="flex-1 h-7 text-xs bg-background"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            disabled={!currentChat?.demo}
            className="size-7"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            disabled={!currentChat?.demo}
            className="size-7"
          >
            {isFullscreen ? (
              <Minimize className="size-3.5" />
            ) : (
              <Maximize className="size-3.5" />
            )}
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          {currentChat?.demo ? (
            <WebPreview defaultUrl={currentChat.demo}>
              <WebPreviewBody key={refreshKey} src={currentChat.demo} className="h-full" />
            </WebPreview>
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No preview available
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Start a conversation to see your app here
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
