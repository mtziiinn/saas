import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Contacts = lazy(() => import("@/pages/contacts"));
const ContactDetail = lazy(() => import("@/pages/contact-detail"));
const Companies = lazy(() => import("@/pages/companies"));
const CompanyDetail = lazy(() => import("@/pages/company-detail"));
const Tasks = lazy(() => import("@/pages/tasks"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Settings = lazy(() => import("@/pages/settings"));
const TreatmentPlans = lazy(() => import("@/pages/treatment-plans"));
const Financial = lazy(() => import("@/pages/financial"));
const PatientPortal = lazy(() => import("@/pages/patient-portal"));
const Inventory = lazy(() => import("@/pages/inventory"));
const Commissions = lazy(() => import("@/pages/commissions"));
const ActivityLog = lazy(() => import("@/pages/activity-log"));
const Reports = lazy(() => import("@/pages/reports"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="grid grid-cols-4 gap-4 mt-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-xl animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 16.2c-1.1-1.1-1.1-3 0-4.1l6.6-6.6c1.1-1.1 3-1.1 4.1 0c1.1 1.1 1.1 3 0 4.1L13.5 9c-1.1 1.1-3 1.1-4.1 0"/><path d="M2 22c2.2-2.2 2.2-5.8 0-8"/><path d="M15 11c1.1 1.1 1.1 3 0 4.1l-1.5 1.5c-1.1 1.1-2.9 1.1-4 0"/><path d="M4 12h4"/></svg>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/paciente/:token" component={PatientPortal} />
        <Route>
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<PageSkeleton />}>
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
                  <Route path="/inventory" component={Inventory} />
                  <Route path="/commissions" component={Commissions} />
                  <Route path="/activity-log" component={ActivityLog} />
                  <Route path="/reports" component={Reports} />
                  <Route path="/settings" component={Settings} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        </Route>
      </Switch>
    </Suspense>
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
