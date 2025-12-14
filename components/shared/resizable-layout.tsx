"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type ResizableLayoutProps = {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
  className?: string
  singlePanelMode?: boolean
  activePanel?: "left" | "right"
}

export function ResizableLayout(props: ResizableLayoutProps) {
  const defaultLeftWidth = props.defaultLeftWidth ?? 30
  const minLeftWidth = props.minLeftWidth ?? 20
  const maxLeftWidth = props.maxLeftWidth ?? 60
  const singlePanelMode = props.singlePanelMode ?? false
  const activePanel = props.activePanel ?? "left"
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Clamp the width between min and max
      const clampedWidth = Math.min(
        Math.max(newLeftWidth, minLeftWidth),
        maxLeftWidth,
      )
      setLeftWidth(clampedWidth)
    },
    [isDragging, minLeftWidth, maxLeftWidth],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (singlePanelMode) {
    return (
      <div
        ref={containerRef}
        className={cn("flex h-full flex-col", props.className)}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {activePanel === "left" ? props.leftPanel : props.rightPanel}
        </div>
      </div>
    )
  }

  // On mobile, conditionally render to avoid stream duplication
  // On desktop, always render both to prevent iframe remounting
  if (isMobile) {
    return (
      <div ref={containerRef} className={cn("flex h-full", props.className)}>
        <div className="flex h-full w-full flex-col">
          {activePanel === "left" ? props.leftPanel : props.rightPanel}
        </div>
      </div>
    )
  }

  // Desktop: Always render both panels to prevent remounting on resize
  return (
    <div ref={containerRef} className={cn("flex h-full", props.className)}>
      <div className="flex flex-col" style={{ width: `${leftWidth}%` }}>
        {props.leftPanel}
      </div>

      <div
        className={cn(
          "group relative w-px cursor-col-resize bg-border transition-all dark:bg-input",
          isDragging && "bg-blue-500 dark:bg-blue-400",
        )}
        onMouseDown={handleMouseDown}
      >
        <div
          className={cn(
            "-translate-x-1/2 absolute inset-y-0 left-1/2 w-0 bg-blue-500 transition-all duration-200 dark:bg-blue-400",
            "group-hover:w-[3px]",
            isDragging && "w-[3px]",
          )}
        />
        <div className="-left-2 -right-2 absolute inset-y-0" />
      </div>

      <div className="flex flex-1 flex-col">{props.rightPanel}</div>
    </div>
  )
}
