import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";
import { getTypedSession } from "../lib/auth-helpers";
import type { Application } from '@/app/generated/prisma'
import { canAccessApp, canAdminApp, isSuperAdmin } from '@/lib/permissions'
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

export const superAdminAction = authenticatedAction.use(async ({ next, ctx }) => {
  if (!isSuperAdmin(ctx.user)) {
    throw new Error('Forbidden')
  }
  return next({ ctx })
})

export const appAdminAction = (app: Application) =>
  authenticatedAction.use(async ({ next, ctx }) => {
    if (!canAdminApp(ctx.user, app)) {
      throw new Error('Forbidden')
    }
    return next({ ctx })
  })

export const appMemberAction = (app: Application) =>
  authenticatedAction.use(async ({ next, ctx }) => {
    if (!canAccessApp(ctx.user, app)) {
      throw new Error('Forbidden')
    }
    return next({ ctx })
  })
