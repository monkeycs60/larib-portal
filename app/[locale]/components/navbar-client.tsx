"use client";

import { Link, useRouter } from "@/app/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { applicationLink } from "@/lib/application-link";

type NavbarUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  position?: string | null;
  role?: "ADMIN" | "USER";
  firstName?: string | null;
  lastName?: string | null;
  applications?: Array<"BESTOF_LARIB" | "CONGES" | "CARDIOLARIB"> | null;
};

export function NavbarClient({ user }: { user?: NavbarUser | null }) {
  const t = useTranslations("navigation");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.firstName ?? user.name ?? user.email;
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return "";
    const pick = (s: string) => (s?.trim()?.charAt(0) ?? "").toUpperCase();
    const first = user.firstName ?? user.name ?? user.email;
    const last = user.lastName ?? "";
    return `${pick(first)}${pick(last)}` || pick(user.email);
  }, [user]);

  const toggleLanguage = () => {
    const newLocale = locale === "en" ? "fr" : "en";
    const currentPath = window.location.pathname.replace(`/${locale}`, "");
    router.push(currentPath || "/", { locale: newLocale });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      // After auth state change, force RSC re-fetch and navigate with locale
      router.push(applicationLink(locale, "/"));
      router.refresh();
    } catch (e: unknown) {
      console.error(e);
      // noop; safe UI
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div />

        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            title={locale === "en" ? "Switch to French" : "Passer en anglais"}
          >
            {locale === "en" ? "EN" : "FR"}
          </Button>

          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="inline-flex items-center gap-2 rounded-full border px-1.5 py-1 hover:bg-gray-50 focus:outline-none"
                  >
                    <Avatar className="size-9 bg-black text-white">
                      <AvatarImage src={user.image ?? undefined} alt={displayName} />
                      <AvatarFallback className="bg-[#0a0a1a] text-white font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="flex items-start gap-3 py-2">
                    <Avatar className="size-10 bg-black text-white">
                      <AvatarImage src={user.image ?? undefined} alt={displayName} />
                      <AvatarFallback className="bg-[#0a0a1a] text-white font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{displayName}</div>
                      <div className="truncate text-xs text-gray-500">{user.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {user.role === "ADMIN" && (
                          <Badge variant="default" className="text-[10px]">{tAdmin('roleAdmin')}</Badge>
                        )}
                        {user.position && (
                          <Badge variant="secondary" className="text-[10px]">{user.position}</Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setOpenEdit(true)}>
                      <Settings className="mr-2 size-4" /> {t("editProfile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">{t("profile")}</Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {(user.applications ?? []).length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-gray-500">{t("applications")}</DropdownMenuLabel>
                      {(user.applications ?? []).map((app) => {
                        const slug = app === 'BESTOF_LARIB' ? '/bestof-larib' : app === 'CONGES' ? '/conges' : '/cardiolarib'
                        return (
                          <DropdownMenuItem key={app} asChild>
                            <Link href={applicationLink(locale, slug)}>
                              {tAdmin(`app_${app}`)}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="mr-2 size-4" /> {isLoggingOut ? t("loggingOut") : t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ProfileEditDialog
                open={openEdit}
                onOpenChange={setOpenEdit}
                initial={{
                  email: user.email,
                  isAdmin: user.role === 'ADMIN',
                  firstName: user.firstName ?? undefined,
                  lastName: user.lastName ?? undefined,
                  phoneNumber: undefined,
                  birthDate: undefined,
                  language: undefined,
                  position: user.position ?? undefined,
                  profilePhoto: undefined,
                  role: user.role,
                  applications: user.applications ?? undefined,
                }}
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">{t("login")}</Button>
              </Link>
              <Link href="/login?mode=signup">
                <Button size="sm">{t("signup")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
