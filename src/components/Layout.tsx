import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  MapPin,
  Menu,
  Bell,
  Building2,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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


/* =========================================================
   NOTIFICATIONS
========================================================= */

const notifications = [
  {
    title: "Anjali Verma replied to your enquiry",
    time: "2 min ago",
  },
  {
    title:
      "Visit reminder — Gomti Nagar room, tomorrow 11:00 AM",
    time: "1 hr ago",
  },
  {
    title:
      "Rental agreement received from Rajeev Srivastava",
    time: "Yesterday",
  },
  {
    title:
      "A saved room dropped its rent by ₹500",
    time: "2 days ago",
  },
];


/* =========================================================
   CITY PILL
========================================================= */

function CityPill() {
  const {
    city,
    openLocationModal,
    cityAvailable,
  } = useApp();

  return (
    <button
      onClick={openLocationModal}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      <MapPin
        className={cn(
          "h-4 w-4",
          cityAvailable
            ? "text-primary"
            : "text-muted-foreground",
        )}
      />

      {city ?? "Set location"}
    </button>
  );
}


/* =========================================================
   HEADER
========================================================= */

export function Header() {
  const [user, setUser] = useState<any>(null);

  const [profile, setProfile] = useState<{
    full_name: string | null;
    role: string | null;
  } | null>(null);

  const [authLoading, setAuthLoading] = useState(true);


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
        const { data: profileData } =
          await supabase
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


    loadUser();


    /* -----------------------------------------------------
       LISTEN FOR AUTH CHANGES
    ----------------------------------------------------- */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const currentUser =
          session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          const { data: profileData } =
            await supabase
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
      },
    );


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

    // Return to home after logout
    window.location.href = "/";
  };


  /* -------------------------------------------------------
     USER INFORMATION
  ------------------------------------------------------- */

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";


  /* -------------------------------------------------------
     ROLE
  ------------------------------------------------------- */

  const isLandlord =
    profile?.role === "landlord";


  /* -------------------------------------------------------
     DASHBOARD ROUTE
  ------------------------------------------------------- */

  const dashboardRoute =
    isLandlord
      ? "/landlord"
      : "/dashboard";


  const dashboardLabel =
    isLandlord
      ? "Landlord Dashboard"
      : "My Dashboard";


  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">

      <div className="container-page flex h-16 items-center justify-between gap-4">


        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="flex items-center gap-6">

          <Logo />


          {/* DESKTOP NAVIGATION */}

          <nav className="hidden items-center gap-1 lg:flex">

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{
                  className:
                    "text-foreground bg-muted",
                }}
              >
                {link.label}
              </Link>
            ))}

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
              NOTIFICATIONS
          ================================================= */}

          <DropdownMenu>

            <DropdownMenuTrigger asChild>

              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full"
              >

                <Bell className="h-[18px] w-[18px]" />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />

              </Button>

            </DropdownMenuTrigger>


            <DropdownMenuContent
              align="end"
              className="w-80 rounded-2xl"
            >

              <DropdownMenuLabel>
                Notifications
              </DropdownMenuLabel>

              <DropdownMenuSeparator />


              {notifications.map((notification) => (

                <DropdownMenuItem
                  key={notification.title}
                  className="flex-col items-start gap-0.5 rounded-xl py-2.5"
                >

                  <span className="text-sm font-medium leading-snug">
                    {notification.title}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {notification.time}
                  </span>

                </DropdownMenuItem>

              ))}

            </DropdownMenuContent>

          </DropdownMenu>


          {/* =================================================
              DESKTOP AUTH
          ================================================= */}

          <div className="hidden items-center gap-2 md:flex">

            {authLoading ? (

              /* LOADING */

              <div className="h-9 w-20 animate-pulse rounded-xl bg-muted" />

            ) : user ? (

              /* =================================================
                 LOGGED IN
              ================================================= */

              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-xl px-3"
                  >

                    {/* PROFILE ICON */}

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">

                      <User className="h-4 w-4" />

                    </span>


                    {/* USER NAME */}

                    <span className="max-w-[120px] truncate font-medium">
                      {displayName}
                    </span>

                  </Button>

                </DropdownMenuTrigger>


                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-2xl"
                >

                  {/* USER INFO */}

                  <DropdownMenuLabel>

                    <div className="flex flex-col">

                      <span className="font-semibold">
                        {displayName}
                      </span>

                      <span className="mt-1 truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>

                      <span className="mt-1 text-xs capitalize text-primary">
                        {isLandlord
                          ? "Property Owner"
                          : "Room Seeker"}
                      </span>

                    </div>

                  </DropdownMenuLabel>


                  <DropdownMenuSeparator />


                  {/* =================================================
                      ROLE-SPECIFIC DASHBOARD
                  ================================================= */}

                  <DropdownMenuItem asChild>

                    <Link
                      to={dashboardRoute}
                      className="cursor-pointer"
                    >

                      <LayoutDashboard className="mr-2 h-4 w-4" />

                      {dashboardLabel}

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

              /* =================================================
                 LOGGED OUT
              ================================================= */

              <>

                <Button
                  asChild
                  variant="ghost"
                  className="rounded-xl"
                >

                  <Link to="/login">
                    Login
                  </Link>

                </Button>


                <Button
                  asChild
                  className="rounded-xl"
                >

                  <Link to="/signup">
                    Sign Up
                  </Link>

                </Button>

              </>

            )}

          </div>


          {/* =================================================
              MOBILE MENU
          ================================================= */}

          <Sheet>

            <SheetTrigger asChild>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full lg:hidden"
              >

                <Menu className="h-5 w-5" />

              </Button>

            </SheetTrigger>


            <SheetContent
              side="right"
              className="w-72 p-6"
            >

              <div className="mt-6 flex flex-col gap-1">


                {/* NAVIGATION */}

                {navLinks.map((link) => (

                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>

                ))}


                {/* =================================================
                    MOBILE LOGGED IN
                ================================================= */}

                {user ? (

                  <>

                    <div className="my-3 border-t border-border" />


                    {/* USER INFO */}

                    <div className="px-3 py-2">

                      <p className="font-semibold">
                        {displayName}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>

                      <p className="mt-1 text-xs capitalize text-primary">
                        {isLandlord
                          ? "Property Owner"
                          : "Room Seeker"}
                      </p>

                    </div>


                    {/* ROLE-SPECIFIC DASHBOARD */}

                    <Link
                      to={dashboardRoute}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium hover:bg-muted"
                    >

                      <LayoutDashboard className="h-4 w-4" />

                      {dashboardLabel}

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

                  /* =================================================
                     MOBILE LOGGED OUT
                  ================================================= */

                  <div className="mt-4 flex flex-col gap-2">

                    <Button
                      asChild
                      variant="outline"
                      className="rounded-xl"
                    >

                      <Link to="/login">
                        Login
                      </Link>

                    </Button>


                    <Button
                      asChild
                      className="rounded-xl"
                    >

                      <Link to="/signup">
                        Sign Up
                      </Link>

                    </Button>

                  </div>

                )}

              </div>

            </SheetContent>

          </Sheet>

        </div>

      </div>

    </header>
  );
}


/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

const bottomNav = [
  {
    to: "/",
    label: "Home",
    icon: Home,
  },
  {
    to: "/search",
    label: "Search",
    icon: Search,
  },
  {
    to: "/saved",
    label: "Saved",
    icon: Heart,
  },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageSquare,
  },
  {
    to: "/dashboard",
    label: "Profile",
    icon: User,
  },
] as const;


export function BottomNav() {

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });


  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden">

      <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">

        {bottomNav.map((item) => {

          const active =
            item.to === "/"
              ? pathname === "/"
              : pathname.startsWith(item.to);


          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >

              <item.icon
                className={cn(
                  "h-5 w-5",
                  active && "fill-primary/10",
                )}
              />

              {item.label}

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
  return (
    <footer className="mt-16 border-t border-border bg-surface">

      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">


        {/* BRAND */}

        <div>

          <Logo />

          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Verified rooms, flats and shared spaces —
            starting with Lucknow.
          </p>

        </div>


        {/* RENTERS */}

        <div>

          <h4 className="text-sm font-semibold">
            For Renters
          </h4>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">

            <li>
              <Link
                to="/search"
                className="hover:text-primary"
              >
                Find a room
              </Link>
            </li>

            <li>
              <Link
                to="/saved"
                className="hover:text-primary"
              >
                Saved rooms
              </Link>
            </li>

            <li>
              <Link
                to="/visits"
                className="hover:text-primary"
              >
                Your visits
              </Link>
            </li>

            <li>
              <Link
                to="/agreement"
                className="hover:text-primary"
              >
                Rental agreement
              </Link>
            </li>

          </ul>

        </div>


        {/* LANDLORDS */}

        <div>

          <h4 className="text-sm font-semibold">
            For Landlords
          </h4>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">

            <li>
              <Link
                to="/list-property"
                className="hover:text-primary"
              >
                List your property
              </Link>
            </li>

            <li>
              <Link
                to="/landlord"
                className="hover:text-primary"
              >
                Landlord dashboard
              </Link>
            </li>

            <li>
              <Link
                to="/how-it-works"
                className="hover:text-primary"
              >
                How it works
              </Link>
            </li>

          </ul>

        </div>


        {/* CITY */}

        <div>

          <h4 className="text-sm font-semibold">
            Available city
          </h4>

          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">

            <Building2 className="h-4 w-4 text-primary" />

            Lucknow, Uttar Pradesh

          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Delhi, Noida, Gurgaon, Bengaluru, Mumbai,
            Pune and Hyderabad — coming soon.
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

export function Page({
  children,
  footer = true,
}: {
  children: ReactNode;
  footer?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">

      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {footer && <Footer />}

      <BottomNav />

    </div>
  );
}