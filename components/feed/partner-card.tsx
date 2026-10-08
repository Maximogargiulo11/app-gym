import Link from "next/link";
import { Avatar } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { PartnerActions } from "./partner-actions";

export type FeedPartnerPost = {
  id: string;
  topic: string;
  days: string[];
  time_label: string | null;
  body: string;
  created_at: string;
  branch_name: string;
  author_id: string;
  author_username: string;
  author_name: string | null;
  author_avatar: string | null;
  joined_count: number;
  joined: boolean;
};

export function PartnerCard({ post: p, viewerId }: { post: FeedPartnerPost; viewerId: string }) {
  const name = p.author_name ?? p.author_username;
  const isOwn = p.author_id === viewerId;
  const when = [p.days.length > 0 ? p.days.join(" y ") : null, p.time_label].filter(Boolean).join(" · ");

  return (
    <article
      aria-labelledby={`p-${p.id}`}
      className="border-border-strong bg-bg rounded-[22px] border border-dashed p-5"
    >
      <header className="mb-3 flex items-center gap-3">
        <Link href={`/u/${p.author_username}`} className="flex min-w-0 items-center gap-3">
          <Avatar name={name} seed={p.author_id} src={p.author_avatar} size="md" highlight={isOwn} />
          <span className="min-w-0">
            <span id={`p-${p.id}`} className="block text-[18px] font-bold">
              {isOwn ? "Buscás compañero" : `${name} busca compañero`}
            </span>
            <span className="text-muted block truncate text-[15px]">
              {p.branch_name} · {timeAgo(p.created_at)}
            </span>
          </span>
        </Link>
      </header>
      <p className="text-accent mb-1 text-sm font-semibold">{p.topic}</p>
      <p className="text-[17px] leading-snug whitespace-pre-line">{p.body}</p>
      {when && <p className="text-muted mt-2 text-sm">{when}</p>}
      <PartnerActions postId={p.id} isOwn={isOwn} initialJoined={p.joined} joinedCount={p.joined_count} />
    </article>
  );
}
