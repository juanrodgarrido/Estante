export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-gutter py-10 pt-safe pb-safe">
      {children}
    </main>
  );
}
