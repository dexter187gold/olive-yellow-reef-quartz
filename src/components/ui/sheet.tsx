import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: DialogPrimitive.DialogContentProps & { side?: "right" | "left" | "bottom" }) {
  const sideClass =
    side === "left"
      ? "left-0 top-0 h-full w-[min(100%,20rem)] border-r"
      : side === "bottom"
        ? "bottom-0 left-0 w-full border-t rounded-t-2xl max-h-[85dvh]"
        : "right-0 top-0 h-full w-[min(100%,24rem)] border-l";
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 bg-card p-5 shadow-soft outline-none border-border",
          sideClass,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: DialogPrimitive.DialogTitleProps) {
  return (
    <DialogPrimitive.Title className={cn("text-base font-semibold", className)} {...props} />
  );
}
