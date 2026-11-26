import { BookMarked, BookOpen, CheckCheck, type LucideIcon } from "lucide-react";
import type { ShelfStatus } from "@/types/shelf";

export const SHELF_ICONS: Record<ShelfStatus, LucideIcon> = {
  reading: BookOpen,
  want: BookMarked,
  read: CheckCheck,
};
