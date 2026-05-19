import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CalendarClock, 
  Settings,
  LogOut,
  Menu,
  Search,
  X,
  Stethoscope,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReactNode, useState, useEffect, useRef } from "react";
import { useGlobalSearch, getGlobalSearchQueryKey } from '@workspace/api-client-react';
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pacientes", href: "/contacts", icon: Users },
  { name: "Clínicas", href: "/companies", icon: Building2 },
  { name: "Agendamentos", href: "/tasks", icon: CalendarClock },
  { name: "Planos de Tratamento", href: "/treatment-plans", icon: FileText },
];

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data: results, isLoading } = useGlobalSearch(
    { q: debouncedQ }, 
    { query: { enabled: debouncedQ.length >= 2, queryKey: getGlobalSearchQueryKey({ q: debouncedQ }) } }
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQ("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (href: string) => {
    setLocation(href);
    setIsOpen(false);
    setQ("");
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar pacientes, clínicas..." 
          className="pl-9 pr-9 bg-card w-full"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {q && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => { setQ(""); setIsOpen(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && debouncedQ.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border rounded-md shadow-md z-50 max-h-[80vh] overflow-y-auto">
          {isLoading && <div className="p-4 text-sm text-center text-muted-foreground">Buscando...</div>}
          
          {!isLoading && results && (
            <div className="py-2">
              {results.contacts.length === 0 && results.companies.length === 0 && results.tasks.length === 0 && (
                <div className="p-4 text-sm text-center text-muted-foreground">Nenhum resultado encontrado.</div>
              )}

                  {results.contacts.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pacientes</div>
                  {results.contacts.map(c => (
                    <button key={c.id} onClick={() => handleSelect(`/contacts/${c.id}`)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-muted rounded-sm text-sm text-left">
                      <span className="font-medium truncate">{c.name}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px] shrink-0">{c.status}</Badge>
                    </button>
                  ))}
                </div>
              )}

                  {results.companies.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clínicas</div>
                  {results.companies.map(c => (
                    <button key={c.id} onClick={() => handleSelect(`/companies/${c.id}`)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-muted rounded-sm text-sm text-left">
                      <span className="font-medium truncate">{c.name}</span>
                      {c.industry && <span className="ml-2 text-xs text-muted-foreground shrink-0">{c.industry}</span>}
                    </button>
                  ))}
                </div>
              )}

                  {results.tasks.length > 0 && (
                <div className="px-2 pb-1">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agendamentos</div>
                  {results.tasks.map(t => (
                    <button key={t.id} onClick={() => handleSelect(`/tasks`)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-muted rounded-sm text-sm text-left">
                      <span className="font-medium truncate">{t.title}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] shrink-0">{t.priority}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const Sidebar = () => (
    <div className="flex h-full flex-col gap-y-5 bg-sidebar px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-lg">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-semibold text-sidebar-foreground text-lg tracking-tight">
              OdontoFlow
            </span>
          </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium
                        ${isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground/70"}`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto space-y-1">
            {user && (
              <div className="px-2 py-2 text-xs text-muted-foreground truncate border-b border-sidebar-border mb-2">
                {user.email}
              </div>
            )}
            <Link
              href="/settings"
              className={`
                group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6
                ${location === "/settings" 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}
              `}
            >
              <Settings
                className={`h-5 w-5 shrink-0 ${location === "/settings" ? "text-primary" : "text-sidebar-foreground/70"}`}
                aria-hidden="true"
              />
              Configurações
            </Link>
            <button
              onClick={logout}
              className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-5 w-5 shrink-0 text-sidebar-foreground/70" aria-hidden="true" />
              Sair
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar */}
      <Sheet>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 shadow-sm sm:px-6 lg:hidden">
          <div className="flex items-center gap-x-4">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-m-2.5 p-2.5">
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-sm">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="font-semibold text-foreground text-sm tracking-tight">
                OdontoFlow
              </span>
            </div>
          </div>
          <div className="flex-1 max-w-[200px] ml-4">
            <GlobalSearch />
          </div>
        </div>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border">
        <Sidebar />
      </div>

      <main className="lg:pl-72 min-h-screen flex flex-col">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 border-b border-border items-center px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="flex flex-1 items-center justify-between">
            <GlobalSearch />
          </div>
        </header>

        <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
