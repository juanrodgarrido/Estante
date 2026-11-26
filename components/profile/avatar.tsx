import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  image: string | null;
  /** Lado en px. */
  size?: number;
  className?: string;
};

/** Avatar redondo; sin foto, la inicial del nombre. */
export function Avatar({ name, image, size = 96, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {image ? (
        <Image src={image} alt={`Foto de ${name}`} width={size} height={size} unoptimized className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}
