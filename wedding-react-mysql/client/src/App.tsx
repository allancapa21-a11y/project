import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AdminLayout } from "@/components/layout/admin-layout";
import IndexPage from "@/pages/index";
import AdminLogin from "@/pages/admin/login";
import DashboardPage from "@/pages/admin/dashboard";
import GuestsPage from "@/pages/admin/guests";
import TablesPage from "@/pages/admin/tables";
import LayoutEditorPage from "@/pages/admin/layout";
import ThemePage from "@/pages/admin/theme";

const queryClient = new QueryClient();

function AdminPages() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin/dashboard" component={DashboardPage} />
        <Route path="/admin/guests" component={GuestsPage} />
        <Route path="/admin/tables" component={TablesPage} />
        <Route path="/admin/layout" component={LayoutEditorPage} />
        <Route path="/admin/theme" component={ThemePage} />
      </Switch>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Switch>
            <Route path="/" component={IndexPage} />
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin/:rest*" component={AdminPages} />
          </Switch>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
