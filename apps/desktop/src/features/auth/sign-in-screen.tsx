import {
  APP_NAME,
  type AtlasClient,
  requestSignInCode,
  SIGN_IN_CODE_LENGTH,
  verifySignInCode,
} from "@atlas/core";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeInput } from "./code-input";

type Step = { name: "email" } | { name: "code"; email: string };

export function SignInScreen({ client }: { client: AtlasClient }) {
  const [step, setStep] = useState<Step>({ name: "email" });

  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {step.name === "email" ? (
          <EmailStep
            client={client}
            onCodeSent={(email) => setStep({ name: "code", email })}
          />
        ) : (
          <CodeStep
            client={client}
            email={step.email}
            onChangeEmail={() => setStep({ name: "email" })}
          />
        )}
      </div>
    </main>
  );
}

function EmailStep({
  client,
  onCodeSent,
}: {
  client: AtlasClient;
  onCodeSent: (email: string) => void;
}) {
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await requestSignInCode(client, email);
    setPending(false);
    if (result.ok) {
      onCodeSent(email.trim());
    } else {
      setError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="font-heading text-3xl tracking-tight">
        Sign in to {APP_NAME}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Enter your email and we'll send you a six-digit code. No password
        needed.
      </p>

      <div className="mt-8 grid gap-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoFocus
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <Button type="submit" className="mt-6" disabled={pending}>
        {pending ? "Sending code…" : "Send code"}
      </Button>
    </form>
  );
}

function CodeStep({
  client,
  email,
  onChangeEmail,
}: {
  client: AtlasClient;
  email: string;
  onChangeEmail: () => void;
}) {
  const codeId = useId();
  const messageId = useId();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function signIn(enteredCode: string) {
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const result = await verifySignInCode(client, email, enteredCode);
    // On success the session listener replaces this screen.
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      setCode("");
    }
  }

  function handleCodeChange(nextCode: string) {
    setCode(nextCode);
    if (nextCode.length === SIGN_IN_CODE_LENGTH) {
      void signIn(nextCode);
    }
  }

  async function handleResend() {
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const result = await requestSignInCode(client, email);
    setPending(false);
    if (result.ok) {
      setCode("");
      setNotice("New code sent.");
    } else {
      setError(result.message);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void signIn(code);
      }}
      noValidate
    >
      <h1 className="font-heading text-3xl tracking-tight">Enter your code</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We sent a six-digit code to{" "}
        <span className="text-foreground">{email}</span>. It expires in ten
        minutes.
      </p>

      <div className="mt-8 grid gap-2">
        <Label htmlFor={codeId}>Sign-in code</Label>
        <CodeInput
          id={codeId}
          value={code}
          onChange={handleCodeChange}
          disabled={pending}
          invalid={Boolean(error)}
          describedBy={error || notice ? messageId : undefined}
        />
        {error && (
          <p id={messageId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p id={messageId} role="status" className="text-sm">
            {notice}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={handleResend}
        >
          Send a new code
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onChangeEmail}
        >
          Use a different email
        </Button>
      </div>
    </form>
  );
}
