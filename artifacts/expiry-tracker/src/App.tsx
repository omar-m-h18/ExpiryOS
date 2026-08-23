import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout';
import { Dashboard } from '@/pages/dashboard';
import { ItemsList } from '@/pages/items-list';
import { ItemForm } from '@/pages/item-form';
import { Landing } from '@/pages/landing';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public landing page (demo + waitlist) */}
      <Route path="/" component={Landing} />

      {/* App — flat, explicit routes under /demo. Each is wrapped in AppLayout.
          Using flat routes avoids wouter splat/nesting edge cases (e.g. bare
          "/demo" falling through to NotFound). */}
      <Route path="/demo">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/demo/items">
        <AppLayout>
          <ItemsList />
        </AppLayout>
      </Route>
      <Route path="/demo/items/new">
        <AppLayout>
          <ItemForm />
        </AppLayout>
      </Route>
      <Route path="/demo/items/:id/edit">
        <AppLayout>
          <ItemForm />
        </AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
