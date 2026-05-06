"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props & {
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  return (
    <PopoverPortal>
      <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[side=bottom]:animate-in data-[side=left]:animate-in data-[side=right]:animate-in data-[side=top]:animate-in data-[side=bottom]:fade-in-0 data-[side=left]:fade-in-0 data-[side=right]:fade-in-0 data-[side=top]:fade-in-0 data-[side=bottom]:zoom-in-95 data-[side=left]:zoom-in-95 data-[side=right]:zoom-in-95 data-[side=top]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-top-2 data-closed:slide-out-to-right-2 data-closed:slide-out-to-left-2 data-closed:slide-out-to-bottom-2",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPortal>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverPortal }
