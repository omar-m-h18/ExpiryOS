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

      {/* The actual app — under /demo (wildcard so sub-paths match the layout) */}
      <Route path="/demo/:rest*">
        <AppLayout>
          <Switch>
            <Route path="/demo" component={Dashboard} />
            <Route path="/demo/items" component={ItemsList} />
            <Route path="/demo/items/new" component={ItemForm} />
            <Route path="/demo/items/:id/edit" component={ItemForm} />
            <Route component={NotFound} />
          </Switch>
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
