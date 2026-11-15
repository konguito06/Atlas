import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";
import type * as React from "react";

/** Put one around a group of tooltips so they share their timing. */
function TooltipProvider({ ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={500} closeDelay={0} {...props} />;
}

interface TooltipProps {
  /** What the tooltip says. Leave out to show no tooltip. */
  label?: React.ReactNode;
  side?: TooltipPrimitive.Positioner.Props["side"];
  /** The control being described; it must take a ref and event handlers. */
  children: React.ReactElement;
}

/**
 * A short hint beside a control. It repeats what the control's accessible
 * name already says, so it is never the only place a label lives.
 */
function Tooltip({ label, side = "right", children }: TooltipProps) {
  if (!label) return children;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={10}>
          <TooltipPrimitive.Popup
            data-slot="tooltip"
            className={cn(
              "z-50 flex items-center gap-2 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md",
              "origin-(--transform-origin) transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none",
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
