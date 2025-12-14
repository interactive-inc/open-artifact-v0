import { Circle, Maximize, Minimize, RefreshCw } from "lucide-react"
import {
  WebPreview,
  WebPreviewBody,
} from "@/components/ai-elements/web-preview"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Chat = {
  id: string
  demo?: string
  url?: string
}

type Props = {
  currentChat: Chat | null
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  refreshKey: number
  setRefreshKey: (key: number | ((prev: number) => number)) => void
}

export function PreviewPanel(props: Props) {
  return (
    <div
      className={cn(
        "flex h-full flex-col transition-all duration-300",
        props.isFullscreen ? "fixed inset-0 z-50 bg-background p-0" : "p-2",
      )}
    >
      <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Circle className="size-3 fill-red-500 text-red-500" />
            <Circle className="size-3 fill-yellow-500 text-yellow-500" />
            <Circle className="size-3 fill-green-500 text-green-500" />
          </div>
          <Input
            readOnly
            placeholder="Your app will appear here..."
            value={props.currentChat?.demo || ""}
            className="h-7 flex-1 bg-background text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => props.setRefreshKey((prev) => prev + 1)}
            disabled={!props.currentChat?.demo}
            className="size-7"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => props.setIsFullscreen(!props.isFullscreen)}
            disabled={!props.currentChat?.demo}
            className="size-7"
          >
            {props.isFullscreen ? (
              <Minimize className="size-3.5" />
            ) : (
              <Maximize className="size-3.5" />
            )}
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          {props.currentChat?.demo ? (
            <WebPreview defaultUrl={props.currentChat.demo}>
              <WebPreviewBody
                key={props.refreshKey}
                src={props.currentChat.demo}
                className="h-full"
              />
            </WebPreview>
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/30">
              <div className="text-center">
                <p className="font-medium text-muted-foreground text-sm">
                  No preview available
                </p>
                <p className="text-muted-foreground/70 text-xs">
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
