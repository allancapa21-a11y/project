import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { LayoutDashboard, Users, Table2, Map, Palette, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/guests", label: "Guests", icon: Users },
  { href: "/admin/tables", label: "Tables", icon: Table2 },
  { href: "/admin/layout", label: "Floor Plan", icon: Map },
  { href: "/admin/theme", label: "Theme", icon: Palette },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    retry: false,
  });

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.clear();
      setLocation("/admin/login");
    },
  });

  useEffect(() => {
    if (!isLoading && !me) {
      setLocation("/admin/login");
    }
  }, [me, isLoading, setLocation]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!me) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-serif text-primary font-semibold">Wedding Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">Signed in as {me.username}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <a className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                location.startsWith(href)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <Icon className="h-4 w-4" />
                {label}
              </a>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => logout.mutate()}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
