import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";
import { getTypedSession } from "../lib/auth-helpers";
// role is now hydrated on session.user in getTypedSession

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e.message);
    // Surface full error message to client as requested
    return e.message || DEFAULT_SERVER_ERROR_MESSAGE;
  },
});

export const authenticatedAction = actionClient.use(async ({ next }) => {
  const session = await getTypedSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }
  
  return next({
    ctx: {
      userId: session.user.id,
      user: session.user,
      session,
    },
  });
});

export const unauthenticatedAction = actionClient;

export const adminOnlyAction = authenticatedAction.use(async ({ next, ctx }) => {
  const role = ctx.user.role as 'ADMIN' | 'USER' | undefined
  if (role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return next({ ctx })
});
