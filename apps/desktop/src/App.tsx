import { APP_NAME } from "@atlas/core";

export function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {APP_NAME}
      </h1>
      <p className="text-muted-foreground text-sm">Nothing here yet.</p>
    </main>
  );
}
