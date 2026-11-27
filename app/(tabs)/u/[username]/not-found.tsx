import { UserX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function UserNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="No encontramos a esta persona"
      description="Puede que el nombre de usuario esté mal escrito o que ya no exista."
      action={{ href: "/amigos", label: "Buscar amigos" }}
    />
  );
}
