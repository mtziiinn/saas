import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import Companies from "@/pages/companies";
import CompanyDetail from "@/pages/company-detail";
import Tasks from "@/pages/tasks";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import TreatmentPlans from "@/pages/treatment-plans";
import Financial from "@/pages/financial";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-xl animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 16.2c-1.1-1.1-1.1-3 0-4.1l6.6-6.6c1.1-1.1 3-1.1 4.1 0c1.1 1.1 1.1 3 0 4.1L13.5 9c-1.1 1.1-3 1.1-4.1 0"/><path d="M2 22c2.2-2.2 2.2-5.8 0-8"/><path d="M15 11c1.1 1.1 1.1 3 0 4.1l-1.5 1.5c-1.1 1.1-2.9 1.1-4 0"/><path d="M4 12h4"/></svg>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route>
        <ProtectedRoute>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/contacts/:id" component={ContactDetail} />
              <Route path="/companies" component={Companies} />
              <Route path="/companies/:id" component={CompanyDetail} />
              <Route path="/tasks" component={Tasks} />
              <Route path="/treatment-plans" component={TreatmentPlans} />
              <Route path="/treatment-plans/:id" component={TreatmentPlans} />
              <Route path="/financial" component={Financial} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
