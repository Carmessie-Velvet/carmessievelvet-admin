"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";

function initialsFor(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function AppHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Notificaciones"
          onClick={() => toast("Notificaciones — muy pronto.")}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none hover:bg-muted">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {user ? initialsFor(user.email) : "CV"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="max-w-40 truncate text-xs font-medium">
                {user?.email ?? "Equipo Carmessie Velvet"}
              </span>
              <span className="text-[11px] text-muted-foreground">Admin</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">
                {user?.email ?? "Equipo Carmessie Velvet"}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Configuración (próximamente)</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
