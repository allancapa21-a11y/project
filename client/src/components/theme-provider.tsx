import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApplyTheme } from "@/hooks/use-apply-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    staleTime: 30_000,
  });
  useApplyTheme(settings);
  return <>{children}</>;
}
