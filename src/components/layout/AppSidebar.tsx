"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers3,
  LayoutDashboard,
  Package,
  Percent,
  ShoppingBag,
  Tag,
  Ticket,
  Truck,
  Undo2,
  Warehouse,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: ShoppingBag },
  { href: "/categorias", label: "Categorías", icon: Layers3 },
  { href: "/ordenes", label: "Órdenes", icon: Package },
  { href: "/devoluciones", label: "Devoluciones", icon: Undo2 },
  { href: "/cupones", label: "Cupones", icon: Ticket },
  { href: "/descuentos", label: "Descuentos", icon: Percent },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/metodos-envio", label: "Métodos de envío", icon: Truck },
  { href: "/envios-automatizados", label: "Envíos automatizados", icon: Warehouse },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            CV
          </span>
          <Image
            src="/brand/carmessie-mark-ink.png"
            alt="Carmessie Velvet"
            width={186}
            height={32}
            className="h-5 w-auto group-data-[collapsible=icon]:hidden"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      className={cn(
                        // Pastilla sólida en el color de marca para el ítem
                        // activo — igual que la referencia (naranja ahí,
                        // primary acá). Se pinta a mano con !important en
                        // vez de reusar --sidebar-accent (ese token queda
                        // libre para el hover suave de los ítems inactivos).
                        isActive && "!bg-primary !text-primary-foreground shadow-sm"
                      )}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="border-t border-sidebar-border px-2 py-2.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Panel interno · v0.1
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
