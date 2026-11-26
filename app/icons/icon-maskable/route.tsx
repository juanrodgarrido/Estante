import { brandIcon } from "@/lib/brand-icon";

// Dibujo al 80 % para quedar dentro de la zona segura de los iconos maskable.
export function GET() {
  return brandIcon(512, 0.8);
}
