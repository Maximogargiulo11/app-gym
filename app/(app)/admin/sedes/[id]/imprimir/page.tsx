import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { BackHeader } from "@/components/layout/back-header";
import { checkinUrl, qrSvg, siteUrl } from "@/lib/sede/qr";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Imprimir QR" };

/** Cartel para recepción: una hoja con el QR de la sede. */
export default async function PrintQrPage({ params }: PageProps<"/admin/sedes/[id]/imprimir">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: branch }, { data: token }] = await Promise.all([
    supabase.from("branches").select("name, slug, gym:gyms(name)").eq("id", id).maybeSingle(),
    // Solo el staff del gimnasio obtiene el token; para el resto da error.
    supabase.rpc("branch_qr_token", { p_branch_id: id }),
  ]);
  if (!branch || !token) notFound();
  const svg = await qrSvg(checkinUrl(await siteUrl(), branch.slug, token));

  return (
    <>
      <div className="print:hidden">
        <BackHeader href="/admin/sedes" label="Volver al admin" title="Imprimir QR" />
      </div>

      <article className="rounded-card mx-auto flex max-w-sm flex-col items-center bg-white px-6 py-10 text-center text-[#0F1110] print:max-w-none print:rounded-none print:px-0 print:py-16">
        <span className="font-display text-[44px] leading-none tracking-tight print:text-[64px]">BANCA</span>
        <p className="mt-6 text-[22px] font-semibold print:text-[32px]">Hacé tu check-in</p>
        <p className="mt-1 text-[16px] text-[#3b403c] print:text-[22px]">
          {branch.gym?.name} · {branch.name}
        </p>
        <div
          role="img"
          aria-label={`QR de check-in de ${branch.name}`}
          className="my-8 w-64 print:w-[110mm] [&_svg]:block [&_svg]:size-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="max-w-xs text-[15px] leading-snug text-[#3b403c] print:max-w-md print:text-[20px]">
          Abrí Banca, tocá <strong>Check-in</strong> y escaneá este código. También funciona con la cámara del celular.
        </p>
      </article>

      <div className="mt-6">
        <PrintButton />
      </div>
    </>
  );
}
