import { type AtlasClient, useSession } from "@atlas/core";
import { SignInScreen } from "@/features/auth/sign-in-screen";
import { HomeScreen } from "@/features/home/home-screen";

export function App({ client }: { client: AtlasClient }) {
  const session = useSession(client);

  // Render nothing while the stored session is read, to avoid flashing the
  // sign-in form at someone who is already signed in.
  if (session.status === "loading") {
    return null;
  }
  if (session.status === "signed-out") {
    return <SignInScreen client={client} />;
  }
  return <HomeScreen client={client} email={session.email} />;
}
