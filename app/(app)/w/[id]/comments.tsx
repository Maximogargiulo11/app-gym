"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, Button, FormMessage, Spinner } from "@/components/ui";
import { ReportButton } from "@/components/social/report-button";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export type CommentItem = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: { username: string; full_name: string | null; avatar_url: string | null } | null;
};

type Props = { workoutId: string; viewerId: string; isWorkoutOwner: boolean; comments: CommentItem[] };

export function Comments({ workoutId, viewerId, isWorkoutOwner, comments }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const { error } = await createClient().from("comments").insert({ workout_id: workoutId, body: text });
      if (error) return setError("No pudimos publicar el comentario.");
      setBody("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await createClient().from("comments").delete().eq("id", id);
      router.refresh();
    });
  }

  return (
    <section id="comentarios" aria-labelledby="comentarios-titulo" className="scroll-mt-6">
      <h2 id="comentarios-titulo" className="mb-3 text-lg font-semibold">
        Comentarios
      </h2>
      {comments.length === 0 ? (
        <p className="text-muted mb-4 text-[15px]">Todavía no hay comentarios. Dejá el primero.</p>
      ) : (
        <ul className="mb-4 space-y-4">
          {comments.map((c) => {
            const name = c.author?.full_name ?? c.author?.username ?? "Alguien";
            const canDelete = c.user_id === viewerId || isWorkoutOwner;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar name={name} seed={c.user_id} src={c.author?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {c.author ? (
                      <Link href={`/u/${c.author.username}`} className="font-semibold hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{name}</span>
                    )}{" "}
                    <span className="text-muted">· {timeAgo(c.created_at)}</span>
                  </p>
                  <p className="text-[16px] break-words whitespace-pre-line">{c.body}</p>
                  <div className="flex items-center gap-3">
                    {c.user_id !== viewerId && <ReportButton targetType="comment" targetId={c.id} variant="link" />}
                  </div>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="Borrar comentario"
                    className="size-tap rounded-btn text-muted hover:bg-surface inline-flex shrink-0 items-center justify-center"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Escribí un comentario</span>
          <textarea
            value={body}
            maxLength={500}
            rows={1}
            placeholder="Escribí un comentario…"
            onChange={(e) => setBody(e.target.value)}
            className="rounded-btn border-border-strong bg-bg placeholder:text-muted/70 focus:border-accent max-h-32 min-h-12 w-full border px-4 py-3 text-[16px] outline-none"
          />
        </label>
        <Button type="submit" disabled={pending || !body.trim()} className="h-12">
          {pending ? <Spinner /> : "Enviar"}
        </Button>
      </form>
      <div className="mt-2">
        <FormMessage error={error} />
      </div>
    </section>
  );
}
