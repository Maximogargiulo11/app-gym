import { KeyRound, Printer, Swords, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { ClaimForm } from "@/components/admin/claim-form";
import { RotateQrButton } from "@/components/admin/rotate-qr-button";
import { BackHeader } from "@/components/layout/back-header";
import { Button, ButtonLink, Card, ErrorState, SectionLabel } from "@/components/ui";
import { checkinUrl, qrSvg, siteUrl } from "@/lib/sede/qr";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import { deleteChallenge } from "./actions";

export const metadata: Metadata = { title: "Admin de sedes" };

const TZ = "America/Argentina/Cordoba";

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

export default async function AdminSedesPage() {
  const profile = (await getMyProfile())!;
  const gym = profile.branch?.gym;
  const supabase = await createClient();
  const { data: staff } = gym
    ? await supabase.from("gym_staff").select("gym_id").eq("gym_id", gym.id).eq("user_id", profile.id).maybeSingle()
    : { data: null };

  if (!gym || !staff) {
    return (
      <>
        <BackHeader href="/perfil" label="Volver al perfil" title="Admin de sedes" />
        <Card className="mb-4 flex items-start gap-3">
          <KeyRound aria-hidden className="text-accent mt-0.5 size-5 shrink-0" />
          <p className="text-soft text-[15px] leading-snug">
            Esta sección es para el equipo del gimnasio. Si te dieron un código de administrador, ingresalo acá.
          </p>
        </Card>
        <ClaimForm />
      </>
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const monthEnd = new Date(Date.parse(`${today.slice(0, 7)}-01T12:00:00Z`));
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);

  const [{ data: branches, error }, { data: challenges }, base] = await Promise.all([
    supabase.from("branches").select("id, name, slug").eq("gym_id", gym.id).order("name"),
    supabase
      .from("challenges")
      .select("id, title, starts_on, ends_on, challenge_branches(branch:branches(name))")
      .gte("ends_on", today)
      .order("starts_on"),
    siteUrl(),
  ]);
  if (error) return <ErrorState message="No pudimos cargar las sedes." />;

  const qrs = await Promise.all(
    (branches ?? []).map(async (b) => {
      const { data: token } = await supabase.rpc("branch_qr_token", { p_branch_id: b.id });
      const url = token ? checkinUrl(base, b.slug, token) : null;
      return { ...b, url, svg: url ? await qrSvg(url) : null };
    }),
  );

  return (
    <>
      <BackHeader href="/perfil" label="Volver al perfil" title="Admin de sedes" />
      <p className="text-muted -mt-3 mb-6 text-[15px]">{gym.name}</p>

      <section aria-labelledby="qrs" className="mb-10">
        <h2 id="qrs" className="mb-3 text-lg font-semibold">
          QR de check-in
        </h2>
        <ul className="space-y-4">
          {qrs.map((b) => (
            <li key={b.id}>
              <Card>
                <SectionLabel>{b.slug}</SectionLabel>
                <h3 className="font-display mt-1 mb-4 text-[22px]">{b.name}</h3>
                {b.svg ? (
                  <div
                    role="img"
                    aria-label={`QR de check-in de ${b.name}`}
                    className="mx-auto mb-4 w-48 overflow-hidden rounded-xl bg-white [&_svg]:block [&_svg]:size-full"
                    dangerouslySetInnerHTML={{ __html: b.svg }}
                  />
                ) : (
                  <p className="text-danger mb-4 text-sm">No pudimos generar el QR.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <ButtonLink href={`/admin/sedes/${b.id}/imprimir`} variant="secondary">
                    <Printer aria-hidden className="size-4" />
                    Imprimir
                  </ButtonLink>
                  <RotateQrButton branchId={b.id} branchName={b.name} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <p className="text-muted mt-3 text-sm leading-snug">
          El QR se valida en el servidor. Si alguien lo fotografía y lo comparte, rotalo: el impreso deja de funcionar y
          tenés que imprimir el nuevo.
        </p>
      </section>

      <section aria-labelledby="desafios" className="mb-10">
        <h2 id="desafios" className="mb-3 text-lg font-semibold">
          Desafíos activos y próximos
        </h2>
        {(challenges ?? []).length === 0 ? (
          <p className="text-muted mb-4 text-[15px]">No hay desafíos activos.</p>
        ) : (
          <ul className="mb-6 space-y-3">
            {(challenges ?? []).map((c) => (
              <li key={c.id} className="rounded-card bg-surface flex items-center gap-3 p-4">
                <Swords aria-hidden className="text-accent size-5 shrink-0" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="text-muted truncate text-sm">
                    {shortDate(c.starts_on)} al {shortDate(c.ends_on)} ·{" "}
                    {c.challenge_branches
                      .map((cb) => cb.branch?.name)
                      .filter(Boolean)
                      .join(" vs ")}
                  </p>
                </div>
                <form action={deleteChallenge}>
                  <input type="hidden" name="challenge_id" value={c.id} />
                  <Button type="submit" variant="ghost" aria-label={`Borrar desafío ${c.title}`} className="px-3">
                    <Trash2 aria-hidden className="size-5" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <Card>
          <h3 className="mb-4 font-semibold">Nuevo desafío</h3>
          <ChallengeForm
            branches={(branches ?? []).map((b) => ({ id: b.id, name: b.name }))}
            defaultStart={today}
            defaultEnd={monthEnd.toISOString().slice(0, 10)}
          />
        </Card>
      </section>
    </>
  );
}
