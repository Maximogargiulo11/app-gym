import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4 pt-8" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="rounded-pill h-11 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
