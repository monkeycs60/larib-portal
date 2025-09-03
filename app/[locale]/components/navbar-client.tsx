"use client";

import { Link, useRouter } from "@/app/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type NavbarUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  position?: string | null;
  role?: "ADMIN" | "USER";
  firstName?: string | null;
  lastName?: string | null;
};

export function NavbarClient({ user }: { user?: NavbarUser | null }) {
  const t = useTranslations("navigation");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      router.push("/");
    } catch (e: unknown) {
      console.error(e);
      // noop; safe UI
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <Avatar className="size-10 bg-black text-white">
                <AvatarImage src={user.image ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-[#0a0a1a] text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <div className="font-semibold text-sm md:text-base">
                  {t("welcomeBackUser", { name: displayName })}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {user.position && (
                    <Badge variant="secondary">{user.position}</Badge>
                  )}
                  {user.role === "ADMIN" && (
                    <Badge variant="default">{tAdmin("roleAdmin")}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

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
              <Link href="/profile" aria-label={t("profile")}>
                <Button variant="ghost" size="sm">
                  <Settings />
                  <span className="hidden sm:inline">{t("editProfile")}</span>
                </Button>
              </Link>
              <Button onClick={handleLogout} disabled={isLoggingOut} variant="outline" size="sm">
                {isLoggingOut ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    <span>{t("loggingOut")}</span>
                  </>
                ) : (
                  <>
                    <LogOut />
                    <span>{t("logout")}</span>
                  </>
                )}
              </Button>
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

