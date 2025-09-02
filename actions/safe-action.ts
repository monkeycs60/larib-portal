import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";
import { getTypedSession } from "../lib/auth-helpers";
import { getUserRole } from "@/lib/services/users";

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e.message);
    return DEFAULT_SERVER_ERROR_MESSAGE;
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
  let role = ctx.user.role as 'ADMIN' | 'USER' | undefined
  if (!role) {
    role = await getUserRole(ctx.user.id)
  }
  if (role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return next({ ctx: { ...ctx, user: { ...(ctx.user), role } } })
});
