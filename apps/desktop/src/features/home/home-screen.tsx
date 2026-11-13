import { APP_NAME, type AtlasClient, signOut } from "@atlas/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function HomeScreen({
  client,
  email,
}: {
  client: AtlasClient;
  email: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSignOut() {
    setPending(true);
    setError(undefined);
    const result = await signOut(client);
    // On success the session listener replaces this screen.
    if (!result.ok) {
      setPending(false);
      setError(result.message);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl tracking-tight">{APP_NAME}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Signed in as <span className="text-foreground">{email}</span>. Nothing
          here yet.
        </p>
        <Button
          variant="outline"
          className="mt-8"
          disabled={pending}
          onClick={handleSignOut}
        >
          {pending ? "Signing out…" : "Sign out"}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
