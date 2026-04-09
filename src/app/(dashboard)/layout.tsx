import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ActorProvider } from "@/components/layout/actor-provider";
import { getActorContext } from "@/lib/auth-utils";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActorContext();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <ThemeProvider>
      <ActorProvider role={actor.role} displayName={actor.displayName} email={actor.email}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar
            user={{
              email: actor.email,
              displayName: actor.displayName,
              role: actor.role,
            }}
          />
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </ActorProvider>
    </ThemeProvider>
  );
}
