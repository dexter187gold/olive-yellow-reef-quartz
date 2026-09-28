import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      tone: {
        muted: "bg-muted text-muted-foreground",
        open: "bg-open/15 text-open",
        pending: "bg-pending/15 text-pending",
        waiting: "bg-waiting/15 text-waiting",
        resolved: "bg-resolved/15 text-resolved",
        closed: "bg-closed/15 text-closed",
        urgent: "bg-urgent/15 text-urgent",
        high: "bg-high/15 text-high",
        medium: "bg-medium/15 text-medium",
        low: "bg-low/15 text-low",
        whatsapp: "bg-whatsapp/15 text-whatsapp",
        facebook: "bg-facebook/15 text-facebook",
        email: "bg-email/15 text-email",
        web: "bg-web/15 text-web",
        portal: "bg-portal/15 text-portal",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}
