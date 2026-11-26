import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  name: string;
  label: string;
  error?: string;
  /** Contenido a la derecha del input (p. ej. botón de mostrar contraseña). */
  trailing?: React.ReactNode;
};

export function Field({ name, label, error, trailing, className, ...props }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={trailing ? "pr-12" : className}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
