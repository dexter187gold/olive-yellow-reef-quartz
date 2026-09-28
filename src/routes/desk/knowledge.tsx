import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listKnowledge, saveKnowledge } from "@/lib/desk/server";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/desk/knowledge")({ component: KnowledgePage });

function KnowledgePage() {
  const kb = useQuery({ queryKey: ["kb"], queryFn: () => listKnowledge() });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const article = kb.data?.find((a) => a.id === active) ?? kb.data?.[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="w-full shrink-0 overflow-y-auto border-b border-border lg:w-80 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-sm font-semibold">Knowledge</h1>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Article
          </Button>
        </div>
        {kb.data?.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActive(a.id)}
            className={`block w-full border-t border-border px-4 py-3 text-left ${
              article?.id === a.id ? "bg-accent" : "hover:bg-accent/40"
            }`}
          >
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{a.category}</p>
            <p className="mt-0.5 text-sm font-medium">{a.title}</p>
          </button>
        ))}
      </aside>
      <article className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        {article ? (
          <>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">{article.category}</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight italic">{article.title}</h2>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{article.body}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No articles yet.</p>
        )}
      </article>
      <ArticleDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function ArticleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Access");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const save = useMutation({
    mutationFn: () => saveKnowledge({ data: { title, category, excerpt, body, published: true } }),
    onSuccess: () => {
      void qc.invalidateQueries();
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New article</DialogTitle>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={6} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              Publish
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
