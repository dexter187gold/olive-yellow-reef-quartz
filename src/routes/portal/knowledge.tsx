import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listKnowledge } from "@/lib/desk/server";

export const Route = createFileRoute("/portal/knowledge")({ component: PortalKnowledge });

function PortalKnowledge() {
  const kb = useQuery({ queryKey: ["kb"], queryFn: () => listKnowledge() });
  const [active, setActive] = useState<number | null>(null);
  const article = kb.data?.find((a) => a.id === active) ?? kb.data?.[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="rounded-2xl border border-border bg-card">
        {kb.data?.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActive(a.id)}
            className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 ${
              article?.id === a.id ? "bg-accent" : ""
            }`}
          >
            <p className="text-[11px] text-muted-foreground uppercase">{a.category}</p>
            <p className="text-sm font-medium">{a.title}</p>
          </button>
        ))}
      </aside>
      {article && (
        <article>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{article.category}</p>
          <h1 className="font-display mt-2 text-3xl tracking-tight italic">{article.title}</h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{article.body}</p>
        </article>
      )}
    </div>
  );
}
