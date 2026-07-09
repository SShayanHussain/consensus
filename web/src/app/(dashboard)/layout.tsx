import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { AuthProvider } from "@/components/providers/auth-provider";
import {
  LayoutDashboard,
  Play,
  ShieldCheck,
  Wrench,
  ScrollText,
  Settings,
} from "lucide-react";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { LogoutButton } from "./logout-button";
import { ProfileMenuItems } from "./profile-menu-items";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch workspace details
  const [workspace] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, session.workspaceId))
    .limit(1);

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/runs", icon: Play, label: "Runs" },
    { href: "/approvals", icon: ShieldCheck, label: "Approvals" },
    { href: "/tools", icon: Wrench, label: "Tools" },
    { href: "/audit", icon: ScrollText, label: "Audit" },
    { href: "/settings/profile", icon: Settings, label: "Settings" },
  ];

  return (
    <AuthProvider initialUser={session.user} initialWorkspaceId={session.workspaceId}>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top bar — command console header */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-6 border-b border-border/60 bg-card/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 flex-1">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span className="font-bold tracking-tight text-sm hidden sm:block">Consensus</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="text-xs font-medium text-muted-foreground truncate max-w-[200px] font-mono">
              {workspace?.name || "Workspace"}
            </div>
          </div>

          <div className="flex items-center gap-x-3">
            {/* User menu */}
            <div className="relative group">
              <button className="h-8 w-8 rounded-full bg-primary/10 border border-border flex items-center justify-center text-primary text-sm font-semibold hover:bg-primary/20 transition-colors cursor-pointer">
                {session.user.name.charAt(0).toUpperCase()}
              </button>
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="px-2 py-1.5 mb-1">
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                </div>
                <div className="h-px bg-border my-1" />
                <ProfileMenuItems />
                <div className="h-px bg-border my-1" />
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-start">
          {/* Left Sidebar — mission control nav */}
          <aside className="sticky top-14 z-30 hidden w-56 shrink-0 border-r border-border/60 lg:block self-start h-[calc(100vh-3.5rem)] bg-card/40">
            <nav className="flex flex-1 flex-col p-3 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/50 hover:text-foreground group"
                >
                  <item.icon className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Status indicator */}
            <div className="absolute bottom-4 left-3 right-3">
              <div className="rounded-lg border border-border/40 bg-card/60 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="font-mono">System Online</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
