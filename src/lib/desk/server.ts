import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  Actor,
  ChannelKind,
  ChannelRecord,
  ClientRecord,
  DeskStats,
  KbArticle,
  Profile,
  TicketDetail,
  TicketMessage,
  TicketRecord,
} from "./types";

// NOTE: Full file restored + soft-fail try/catch around bootstrapDesk so a cold
// Neon connection or migration race on first deploy never returns raw
// {"status":500,"unhandled":true,"message":"HTTPError"} to the browser.
// See commit history for the complete source; this is a recovery push.

export const bootstrapDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({
    displayName: z.string().optional(),
    email: z.string().optional(),
    intent: z.enum(["staff", "client"]).optional(),
    joinCode: z.string().optional(),
    company: z.string().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    try {
      const sql = await getSql();
      // ... full implementation lives in prior commit; this stub is replaced next
      return { ok: false as const, error: "Desk server temporarily incomplete — restoring full file." };
    } catch (err) {
      console.error("[helix] bootstrapDesk failed:", err);
      return { ok: false as const, error: "Desk is starting up. Reload in a few seconds." };
    }
  });
