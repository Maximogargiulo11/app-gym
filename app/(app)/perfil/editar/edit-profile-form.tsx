"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar, Button, FormMessage, Spinner, TextField } from "@/components/ui";
import { normalizeUsername, validateFullName, validateUsername } from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/client";

type Props = { userId: string; fullName: string; username: string; avatarUrl: string | null };

const MAX_BYTES = 2 * 1024 * 1024;

export function EditProfileForm({ userId, fullName: initialName, username: initialUsername, avatarUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  async function onFile(file: File) {
    setMessage({});
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return setMessage({ error: "Usá una foto JPG, PNG o WebP." });
    if (file.size > MAX_BYTES) return setMessage({ error: "La foto tiene que pesar menos de 2 MB." });

    setUploading(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) {
      setUploading(false);
      return setMessage({ error: "No pudimos subir la foto. Probá de nuevo." });
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: updError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setUploading(false);
    if (updError) return setMessage({ error: "No pudimos guardar la foto." });
    setAvatar(url);
    setMessage({ success: "Foto actualizada." });
    router.refresh();
  }

  function save() {
    setMessage({});
    const err = validateFullName(fullName) ?? validateUsername(username);
    if (err) return setMessage({ error: err });
    startTransition(async () => {
      const supabase = createClient();
      if (username !== initialUsername) {
        const { data: available } = await supabase.rpc("username_available", { name: username });
        if (!available) return setMessage({ error: "Ese usuario ya está tomado." });
      }
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), username })
        .eq("id", userId);
      if (error)
        return setMessage({
          error: error.code === "23505" ? "Ese usuario ya está tomado." : "No pudimos guardar los cambios.",
        });
      router.push("/perfil");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Avatar name={fullName} seed={userId} src={avatar} size="lg" highlight />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Elegir foto de perfil"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <Camera aria-hidden className="size-4" />}
          Cambiar foto
        </Button>
      </div>

      <TextField label="Nombre" value={fullName} maxLength={60} onChange={(e) => setFullName(e.target.value)} />
      <TextField
        label="Usuario"
        prefix="@"
        autoCapitalize="none"
        value={username}
        onChange={(e) => setUsername(normalizeUsername(e.target.value))}
        hint="Letras, números, punto y guion bajo."
      />
      <FormMessage error={message.error} success={message.success} />
      <Button size="lg" block onClick={save} disabled={pending}>
        {pending && <Spinner />}
        Guardar cambios
      </Button>
    </div>
  );
}
