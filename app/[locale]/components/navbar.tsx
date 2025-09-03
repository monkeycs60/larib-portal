import { getTypedSession } from "@/lib/auth-helpers";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  const session = await getTypedSession();
  return <NavbarClient user={session?.user} />;
}
