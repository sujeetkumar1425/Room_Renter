import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Heart,
  MessageSquare,
  User as UserIcon,
  MapPin,
  Menu,
  X,
  Bell,
  Building2,
  CalendarDays,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/* =========================================================
   LOGO
========================================================= */

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Home className="h-[18px] w-[18px]" />
      </span>

      <span className="text-lg font-extrabold tracking-tight">
        Room<span className="text-primary">Renter</span>
      </span>
    </Link>
  );
}

/* =========================================================
   NAVIGATION
========================================================= */

const navLinks = [
  {
    to: "/search",
    label: "Find a Room",
  },
  {
    to: "/list-property",
    label: "List Your Property",
  },
  {
    to: "/how-it-works",
    label: "How It Works",
  },
] as const;

type NavigationItem = {
  to: string;
  label: string;
  icon: typeof Home;
  search?: {
    propertyId: undefined;
    landlordId: undefined;
  };
};

/* =========================================================
   DASHBOARD SIDEBAR
========================================================= */

function DashboardSidebar({
  isLandlord,
  displayName,
  userEmail,
  onLogout,
  open,
  onClose,
}: {
  isLandlord: boolean;
  displayName: string;
  userEmail?: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const items: NavigationItem[] = [
    {
      to: isLandlord ? "/landlord" : "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      to: "/search",
      label: "Properties",
      icon: Building2,
    },
    {
      to: "/bookings",
      label: "Bookings",
      icon: CalendarDays,
    },
    {
      to: "/messages",
      label: "Messages",
      icon: MessageSquare,
      search: {
        propertyId: undefined,
        landlordId: undefined,
      },
    },
    {
      to: isLandlord ? "/landlord-profile" : "/profile",
      label: "Profile",
      icon: UserIcon,
    },
  ];

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 hidden bg-foreground/20 backdrop-blur-[1px] lg:block"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-border bg-card/95 px-4 py-6 shadow-[var(--shadow-soft)] backdrop-blur transition-transform duration-200 ease-out lg:flex lg:flex-col",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!open}
      >
        <Logo />

        <div className="mt-10 flex items-center gap-3 rounded-2xl bg-primary/10 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UserIcon className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>

            <p className="truncate text-xs text-muted-foreground">
              {isLandlord ? "Property Owner" : "Room Seeker"}
            </p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Dashboard navigation">
          {items.map((item) => {
            const active =
              item.to === (isLandlord ? "/landlord" : "/dashboard")
                ? pathname === item.to
                : pathname.startsWith(item.to);

            return (
              <Link
                key={`${item.label}-${item.to}`}
                to={item.to}
                search={item.search}
                onClick={onClose}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                activeOptions={{
                  exact: item.label === "Dashboard" || item.label === "Profile",
                }}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4">
          {userEmail ? (
            <p className="truncate px-3 text-xs text-muted-foreground">{userEmail}</p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   CITY PILL
========================================================= */

function CityPill() {
  const { city, openLocationModal, cityAvailable } = useApp();

  return (
    <button
      onClick={openLocationModal}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      <MapPin className={cn("h-4 w-4", cityAvailable ? "text-primary" : "text-muted-foreground")} />

      {city ?? "Set location"}
    </button>
  );
}

/* =========================================================
   HEADER
========================================================= */

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profile, setProfile] = useState<{
    full_name: string | null;
    role: string | null;
  } | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  /* -------------------------------------------------------
     LOAD USER + PROFILE
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", currentUser.id)
          .single();

        if (mounted) {
          setProfile(profileData ?? null);
        }
      } else {
        setProfile(null);
      }

      setAuthLoading(false);
    };

    void loadUser();

    /* -----------------------------------------------------
       LOAD UNREAD NOTIFICATION COUNT
    ----------------------------------------------------- */

    const loadNotificationCount = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser || !mounted) {
        if (mounted) {
          setNotificationCount(0);
        }

        return;
      }

      const { count } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);

      if (mounted) {
        setNotificationCount(count ?? 0);
      }
    };

    void loadNotificationCount();

    /* -----------------------------------------------------
       LISTEN FOR AUTH CHANGES
    ----------------------------------------------------- */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", currentUser.id)
          .single();

        if (mounted) {
          setProfile(profileData ?? null);
        }

        void loadNotificationCount();
      } else {
        setProfile(null);
        setNotificationCount(0);
      }

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* -------------------------------------------------------
     LOGOUT
  ------------------------------------------------------- */

  const handleLogout = async () => {
    await supabase.auth.signOut();

    window.location.href = "/";
  };

  /* -------------------------------------------------------
     USER INFORMATION
  ------------------------------------------------------- */

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  /* -------------------------------------------------------
     ROLE
  ------------------------------------------------------- */

  const isLandlord = profile?.role === "landlord";

  /* -------------------------------------------------------
     ROUTES
  ------------------------------------------------------- */

  const dashboardRoute = isLandlord ? "/landlord" : "/dashboard";

  const profileRoute = isLandlord ? "/landlord-profile" : "/profile";

  const dashboardLabel = isLandlord ? "Landlord Dashboard" : "My Dashboard";

  return (
    <>
      {user && !authLoading ? (
        <DashboardSidebar
          isLandlord={isLandlord}
          displayName={displayName}
          userEmail={user.email}
          onLogout={() => void handleLogout()}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      ) : null}

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="flex items-center gap-3 sm:gap-6">
            {user && !authLoading ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden rounded-xl lg:inline-flex"
                aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((open) => !open)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            ) : null}

            <Logo />

            {/* DESKTOP NAVIGATION */}

            <nav className={cn("hidden items-center gap-1", !user && "lg:flex")}>
              {navLinks.map((link) => {
                if (link.to === "/list-property" && profile?.role === "renter") {
                  return null;
                }

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    activeProps={{
                      className: "text-foreground bg-muted",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="flex items-center gap-2">
            {/* CITY */}

            <div className="hidden sm:block">
              <CityPill />
            </div>

            {/* =================================================
                SAVED ROOMS — RENTER ONLY
            ================================================= */}

            {user && !authLoading && !isLandlord ? (
              <Link
                to="/saved"
                aria-label="Saved rooms"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <Heart className="h-[18px] w-[18px]" />
              </Link>
            ) : null}

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                  <Bell className="h-[18px] w-[18px]" />

                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 rounded-2xl">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/notifications" className="cursor-pointer rounded-xl py-3">
                    <Bell className="mr-2 h-4 w-4" />
                    Open all notifications
                    {notificationCount > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {notificationCount} unread
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* =================================================
                DESKTOP AUTH
            ================================================= */}

            <div className="hidden items-center gap-2 md:flex">
              {authLoading ? (
                <div className="h-9 w-20 animate-pulse rounded-xl bg-muted" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 rounded-xl px-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <UserIcon className="h-4 w-4" />
                      </span>

                      <span className="max-w-[120px] truncate font-medium">{displayName}</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-60 rounded-2xl">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{displayName}</span>

                        <span className="mt-1 truncate text-xs font-normal text-muted-foreground">
                          {user.email}
                        </span>

                        <span className="mt-1 text-xs capitalize text-primary">
                          {isLandlord ? "Property Owner" : "Room Seeker"}
                        </span>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {/* DASHBOARD */}

                    <DropdownMenuItem asChild>
                      <Link to={dashboardRoute} className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />

                        {dashboardLabel}
                      </Link>
                    </DropdownMenuItem>

                    {/* PROFILE */}

                    <DropdownMenuItem asChild>
                      <Link to={profileRoute} className="cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* LOGOUT */}

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button asChild variant="ghost" className="rounded-xl">
                    <Link to="/login">Login</Link>
                  </Button>

                  <Button asChild className="rounded-xl">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>

            {/* =================================================
                MOBILE MENU
            ================================================= */}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-72 p-6">
                <div className="mt-6 flex flex-col gap-1">
                  {/* LOCATION */}

                  <div className="mb-2">
                    <CityPill />
                  </div>

                  {/* NAVIGATION */}

                  {navLinks.map((link) => {
                    if (link.to === "/list-property" && profile?.role === "renter") {
                      return null;
                    }

                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                      >
                        {link.label}
                      </Link>
                    );
                  })}

                  {/* =================================================
                      MOBILE LOGGED IN
                  ================================================= */}

                  {user ? (
                    <>
                      <div className="my-3 border-t border-border" />

                      {/* USER INFO */}

                      <div className="px-3 py-2">
                        <p className="font-semibold">{displayName}</p>

                        <p className="text-xs text-muted-foreground">{user.email}</p>

                        <p className="mt-1 text-xs capitalize text-primary">
                          {isLandlord ? "Property Owner" : "Room Seeker"}
                        </p>
                      </div>

                      {/* SAVED ROOMS */}

                      <Link
                        to="/saved"
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                      >
                        <Heart className="h-4 w-4" />
                        Saved Rooms
                      </Link>

                      {/* MESSAGES */}

                      <Link
                        to="/messages"
                        search={{
                          propertyId: undefined,
                          landlordId: undefined,
                        }}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Messages
                      </Link>

                      {/* NOTIFICATIONS */}

                      <Link
                        to="/notifications"
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                      >
                        <Bell className="h-4 w-4" />
                        Notifications
                        {notificationCount > 0 && (
                          <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            {notificationCount}
                          </span>
                        )}
                      </Link>

                      {/* DASHBOARD */}

                      <Link
                        to={dashboardRoute}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                      >
                        <LayoutDashboard className="h-4 w-4" />

                        {dashboardLabel}
                      </Link>

                      {/* PROFILE */}

                      <Link
                        to={profileRoute}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                      >
                        <UserIcon className="h-4 w-4" />
                        Profile
                      </Link>

                      {/* LOGOUT */}

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left font-medium text-destructive hover:bg-muted"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <div className="mt-4 flex flex-col gap-2">
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link to="/login">Login</Link>
                      </Button>

                      <Button asChild className="rounded-xl">
                        <Link to="/signup">Sign Up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

/*
   LANDLORD NAVIGATION
   -------------------
   Existing landlord navigation remains separate.
*/

const landlordBottomNav = [
  {
    to: "/landlord",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/search",
    label: "Properties",
    icon: Building2,
  },
  {
    to: "/bookings",
    label: "Bookings",
    icon: CalendarDays,
  },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageSquare,
  },
  {
    to: "/landlord-profile",
    label: "Profile",
    icon: UserIcon,
  },
] as const;

/*
   RENTER NAVIGATION
   -----------------
   Home goes to the actual application homepage.
*/

const renterBottomNav = [
  {
    to: "/",
    label: "Home",
    icon: Home,
  },
  {
    to: "/search",
    label: "Explore",
    icon: MapPin,
  },
  {
    to: "/bookings",
    label: "Visits",
    icon: CalendarDays,
  },
  {
    to: "/messages",
    label: "Chat",
    icon: MessageSquare,
  },
  {
    to: "/profile",
    label: "Profile",
    icon: UserIcon,
  },
] as const;

export function BottomNav() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const { role } = useApp();

  const isLandlord = role === "landlord";

  const items = isLandlord ? landlordBottomNav : renterBottomNav;

  return (
    <nav
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 lg:hidden",
        isLandlord
          ? "rounded-2xl border border-border bg-card/95 shadow-[var(--shadow-float)] backdrop-blur-md"
          : "rounded-[24px] border border-primary/10 bg-background/95 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "flex items-stretch px-1 pb-[env(safe-area-inset-bottom)]",
          !isLandlord && "p-1",
        )}
      >
        {items.map((item) => {
          /*
             Home on renter side is the actual homepage.
             We use exact matching so /dashboard doesn't
             accidentally activate Home.
          */

          const active =
            item.to === "/"
              ? pathname === "/"
              : pathname === item.to || pathname.startsWith(`${item.to}/`);

          return (
            <Link
              key={item.label}
              to={item.to}
              search={
                item.label === "Chat"
                  ? {
                      propertyId: undefined,
                      landlordId: undefined,
                    }
                  : item.label === "Explore"
                    ? {
                        city: undefined,
                        type: undefined,
                        budget: undefined,
                      }
                    : undefined
              }
              className={cn(
                "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all sm:text-[11px]",

                /* LANDLORD STYLE */
                isLandlord
                  ? active
                    ? "rounded-xl bg-primary/10 text-primary"
                    : "text-muted-foreground"
                  : /* RENTER STYLE */
                    active
                    ? "rounded-[18px] bg-primary text-primary-foreground shadow-sm"
                    : "rounded-[18px] text-muted-foreground hover:bg-primary/5 hover:text-primary",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] transition-transform",
                  !isLandlord && active && "scale-110",
                )}
              />

              <span>{item.label}</span>

              {/* RENTER ACTIVE INDICATOR */}

              {!isLandlord && active ? (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary-foreground" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* =========================================================
   FOOTER
========================================================= */

export function Footer() {
  const { role, city } = useApp();

  return (
    <footer className="mt-16 hidden border-t border-border bg-surface lg:block">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* BRAND */}

        <div>
          <Logo />

          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Verified rooms, flats and shared spaces — built for renters and property owners.
          </p>
        </div>

        {/* RENTERS */}

        <div>
          <h4 className="text-sm font-semibold">For Renters</h4>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                to="/search"
                search={{
                  city: undefined,
                  type: undefined,
                  budget: undefined,
                }}
                className="hover:text-primary"
              >
                Find a room
              </Link>
            </li>

            <li>
              <Link to="/saved" className="hover:text-primary">
                Saved rooms
              </Link>
            </li>
          </ul>
        </div>

        {/* LANDLORDS */}

        <div>
          <h4 className="text-sm font-semibold">For Landlords</h4>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              {role !== "renter" && (
                <Link to="/list-property" className="hover:text-primary">
                  List Your Property
                </Link>
              )}
            </li>

            <li>
              <Link to="/landlord" className="hover:text-primary">
                Landlord dashboard
              </Link>
            </li>

            <li>
              <Link to="/how-it-works" className="hover:text-primary">
                How it works
              </Link>
            </li>
          </ul>
        </div>

        {/* CITY */}

        <div>
          <h4 className="text-sm font-semibold">Available city</h4>

          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />

            {city ? `${city}, India` : "Choose your city"}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Room availability and property listings depend on the selected location.
          </p>
        </div>
      </div>

      {/* COPYRIGHT */}

      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © 2026 Room Renter. Made in India.
      </div>
    </footer>
  );
}

/* =========================================================
   PAGE WRAPPER
========================================================= */

export function Page({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-24 lg:pb-0">{children}</main>

      {footer && <Footer />}

      <BottomNav />
    </div>
  );
}
