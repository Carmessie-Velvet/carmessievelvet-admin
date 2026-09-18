"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { userService } from "@/services/user-service";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api-client";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiUser, CreateAdminPayload, UserRole } from "@/types/users";
import { GRANTABLE_ROLES, USER_ROLE_LABEL } from "@/types/users";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const ROLE_FILTER_OPTIONS: UserRole[] = ["USER", "ADMIN", "MARKETING", "SALES", "SUPER_ADMIN"];

const EMPTY_ADMIN_FORM: CreateAdminPayload = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
};

function roleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  if (role === "SUPER_ADMIN") return "default";
  if (role === "USER") return "outline";
  return "secondary"; // ADMIN, MARKETING, SALES — los tres son "staff" de este panel.
}

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { confirm } = useConfirmDialog();

  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adminForm, setAdminForm] = useState<CreateAdminPayload>(EMPTY_ADMIN_FORM);
  const [createRole, setCreateRole] = useState<UserRole>("ADMIN");

  const [emailTarget, setEmailTarget] = useState<ApiUser | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Buscar en la API en cada tecla sería un llamado por letra — se espera
  // una pausa de tecleo antes de refetch, igual que cualquier búsqueda
  // resuelta del lado del servidor (a diferencia de /productos u /ordenes,
  // que filtran sobre una lista ya cargada completa). `setLoading(true)`
  // vive acá (dentro del callback del `setTimeout`, no síncrono en el
  // cuerpo del efecto) en vez de en el efecto de carga de abajo — mismo
  // criterio que `refreshing` en el dashboard (`page.tsx`).
  //
  // ⚠️ Bug real encontrado en vivo, en dos vueltas:
  // 1) Todo efecto corre también al montar, con el valor inicial de
  //    `searchInput` (`""`) — sin comparar contra algo, ese primer disparo
  //    hacía `setLoading(true)` y luego `setSearch("")`/`setPage(1)` con
  //    los mismos valores con los que ya arrancaban esos dos states, así
  //    que React nunca detectaba un cambio real y el efecto de carga de
  //    abajo (el único que pone `loading` en `false`) nunca se volvía a
  //    ejecutar — la tabla quedaba atenuada (`opacity-60`) para siempre.
  // 2) El primer arreglo usó un `useRef` como bandera de "ya montó" — se
  //    ve razonable, pero Strict Mode (activo en `next dev`) ejecuta cada
  //    efecto dos veces al montar SIN reiniciar los `ref`s entre esas dos
  //    corridas (a diferencia del estado, que si Strict Mode desmontara y
  //    remontara de verdad sí se reiniciaría) — la bandera solo bloqueaba
  //    la primera de esas dos corridas, y la segunda igual armaba el
  //    `setTimeout`. La comparación de abajo (`trimmed === search`) no
  //    depende de nada mutable entre corridas — da el mismo resultado sin
  //    importar cuántas veces Strict Mode repita el efecto.
  useEffect(() => {
    const id = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === search) return;
      setLoading(true);
      setSearch(trimmed);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;

    userService
      .getUsers({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter === "ALL" ? undefined : roleFilter,
      })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar los usuarios.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, roleFilter, router]);

  async function handleCreateAccount() {
    setCreating(true);
    try {
      // `POST /users/admins` siempre crea con roles ["ADMIN"] exactos — la
      // API no deja elegir el rol al crear. Si se pidió Marketing/Ventas,
      // se corrige de inmediato con `assignRoles` (SUPER_ADMIN únicamente,
      // por eso el selector solo ofrece esas opciones a un SUPER_ADMIN —
      // ver el JSX del diálogo). Es una orquestación de dos llamadas
      // existentes, no un endpoint nuevo del backend.
      const created = await userService.createAdmin(adminForm);
      if (createRole !== "ADMIN") {
        await userService.assignRoles(created.id, [createRole]);
      }
      toast.success(
        `Cuenta ${USER_ROLE_LABEL[createRole]} creada — le llegó un correo para verificarla.`
      );
      setCreateOpen(false);
      setAdminForm(EMPTY_ADMIN_FORM);
      setCreateRole("ADMIN");
      // Reinicia los filtros a como se ve la primera página por default. Si
      // ya estaban en ese estado, cambiar el state no dispara el efecto de
      // carga (mismo valor) — por eso se vuelve a pedir la lista acá mismo
      // en vez de confiar en que el reset por sí solo la refresque.
      setSearchInput("");
      setSearch("");
      setRoleFilter("ALL");
      setPage(1);
      setLoading(true);
      const result = await userService.getUsers({ page: 1, limit: PAGE_SIZE });
      setUsers(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setCreating(false);
      setLoading(false);
    }
  }

  async function handleAssignRole(target: ApiUser, role: UserRole) {
    const ok = await confirm({
      title: `¿Otorgar el rol ${USER_ROLE_LABEL[role]} a ${target.firstName} ${target.lastName}?`,
      description: `${target.email} va a poder entrar a este panel con ese rol, sin perder los que ya tiene.`,
      confirmLabel: "Otorgar",
    });
    if (!ok) return;

    setBusyId(target.id);
    try {
      // "Admin" sigue el endpoint dedicado (cualquier ADMIN puede usarlo);
      // Marketing/Ventas van por `assignRoles`, que reemplaza el arreglo
      // completo — por eso se manda la lista actual + el nuevo, deduplicada
      // (mismo criterio aditivo que ya usa `promoteToAdmin` del lado del
      // backend).
      const nextRoles =
        role === "ADMIN"
          ? (await userService.promoteToAdmin(target.id)).roles
          : await userService.assignRoles(target.id, [...new Set([...target.roles, role])]);
      setUsers(
        (prev) => prev?.map((u) => (u.id === target.id ? { ...u, roles: nextRoles } : u)) ?? prev
      );
      toast.success(`${target.email} ahora tiene el rol ${USER_ROLE_LABEL[role]}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo otorgar el rol.");
    } finally {
      setBusyId(null);
    }
  }

  // Mismo endpoint que `handleAssignRole` (`/roles/assign` reemplaza el
  // arreglo completo) — acá se manda la lista actual SIN el rol elegido en
  // vez de agregarlo. La API rechaza (400) un arreglo vacío
  // (`@ArrayNotEmpty` en `AssignRolesDto`), así que nunca puede dejar a
  // alguien sin ningún rol por esta vía — de todos modos no se ofrece el
  // botón cuando sería el último rol (ver el `.filter` en el JSX).
  async function handleRemoveRole(target: ApiUser, role: UserRole) {
    const ok = await confirm({
      title: `¿Quitar el rol ${USER_ROLE_LABEL[role]} a ${target.firstName} ${target.lastName}?`,
      description: `${target.email} deja de poder usar lo que ese rol le daba en este panel.`,
      confirmLabel: "Quitar",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(target.id);
    try {
      const nextRoles = await userService.assignRoles(
        target.id,
        target.roles.filter((r) => r !== role)
      );
      setUsers(
        (prev) => prev?.map((u) => (u.id === target.id ? { ...u, roles: nextRoles } : u)) ?? prev
      );
      toast.success(`Se le quitó el rol ${USER_ROLE_LABEL[role]} a ${target.email}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo quitar el rol.");
    } finally {
      setBusyId(null);
    }
  }

  function openChangeEmail(target: ApiUser) {
    setEmailTarget(target);
    setEmailValue(target.email);
  }

  async function handleChangeEmail() {
    if (!emailTarget) return;

    setSavingEmail(true);
    try {
      const updated = await userService.changeUserEmail(emailTarget.id, emailValue.trim());
      setUsers((prev) => prev?.map((u) => (u.id === emailTarget.id ? updated : u)) ?? prev);
      toast.success("Correo actualizado — se le pidió verificarlo de nuevo.");
      setEmailTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cambiar el correo.");
    } finally {
      setSavingEmail(false);
    }
  }

  const isSuperAdmin = currentUser?.roles.includes("SUPER_ADMIN") ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users
              ? `${total} usuario${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}.`
              : error
                ? "No se pudieron cargar los usuarios."
                : "Cargando usuarios desde la API..."}
          </p>
        </div>
        <Button type="button" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          Crear cuenta
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por email..."
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            // Base UI también dispara esto una vez al montar con `v` vacío
            // (mismo comportamiento ya visto en el `<Select>` de rango del
            // dashboard, `page.tsx` — ahí sí tiene este guard). Sin él,
            // `setLoading(true)` corría en ese disparo espurio y nunca se
            // revertía (`setRoleFilter`/`setPage` con el mismo valor que ya
            // tenían no dispara el efecto de carga que pone `loading` en
            // `false`) — la tabla quedaba atenuada para siempre.
            if (!v) return;
            setLoading(true);
            setRoleFilter(v as UserRole | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue>
              {(value: UserRole | "ALL") =>
                value === "ALL" ? "Todos los roles" : USER_ROLE_LABEL[value]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los roles</SelectItem>
            {ROLE_FILTER_OPTIONS.map((role) => (
              <SelectItem key={role} value={role}>
                {USER_ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!users && !error && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {users && users.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Ningún usuario coincide con el filtro.
        </div>
      )}

      {users && users.length > 0 && (
        <>
          <Card className={cn("overflow-hidden py-0", loading && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isSuperAdminRow = u.roles.includes("SUPER_ADMIN");
                  // Marketing/Ventas van por `assignRoles` (SUPER_ADMIN
                  // únicamente) — un ADMIN normal solo puede seguir
                  // otorgando el rol Admin (el endpoint dedicado). Nunca se
                  // ofrece nada acá para una cuenta que ya es SUPER_ADMIN.
                  const assignableRoles = isSuperAdminRow
                    ? []
                    : GRANTABLE_ROLES.filter(
                        (r) => !u.roles.includes(r) && (r === "ADMIN" || isSuperAdmin)
                      );
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.firstName} {u.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                        {u.phoneNumber && <div className="text-xs">{u.phoneNumber}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => {
                            // Nunca se puede quitar el único rol que le
                            // queda a alguien (la API lo rechazaría de
                            // todos modos, `@ArrayNotEmpty`) ni tocar los
                            // roles de una cuenta SUPER_ADMIN desde acá.
                            const canRemove =
                              isSuperAdmin && !isSuperAdminRow && u.roles.length > 1;
                            return (
                              <Badge key={r} variant={roleBadgeVariant(r)} className="gap-1">
                                {USER_ROLE_LABEL[r]}
                                {canRemove && (
                                  <button
                                    type="button"
                                    aria-label={`Quitar el rol ${USER_ROLE_LABEL[r]}`}
                                    disabled={busyId === u.id}
                                    onClick={() => handleRemoveRole(u, r)}
                                    className="rounded-full hover:opacity-70 disabled:pointer-events-none disabled:opacity-50"
                                  >
                                    <X className="size-3" />
                                  </button>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {!u.enabled && <Badge variant="destructive">Deshabilitada</Badge>}
                          {!u.emailVerifiedAt && <Badge variant="outline">Sin verificar</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {assignableRoles.map((role) => (
                            <Button
                              key={role}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={busyId === u.id}
                              onClick={() => handleAssignRole(u, role)}
                            >
                              {busyId === u.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="size-3.5" />
                              )}
                              + {USER_ROLE_LABEL[role]}
                            </Button>
                          ))}
                          {isSuperAdmin && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "No puedes cambiar tu propio correo desde acá — cerraría tu sesión actual."
                                  : undefined
                              }
                              onClick={() => openChangeEmail(u)}
                            >
                              <Mail className="size-3.5" />
                              Cambiar correo
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} · {total} en total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => p - 1);
                  }}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => p + 1);
                  }}
                >
                  Siguiente
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear cuenta</DialogTitle>
            <DialogDescription>
              Va a poder entrar a este panel con estos datos — nace sin verificar, como
              cualquier cuenta nueva.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateAccount();
            }}
          >
            {isSuperAdmin ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-role">Rol</Label>
                <Select value={createRole} onValueChange={(v) => setCreateRole(v as UserRole)}>
                  <SelectTrigger id="create-role">
                    <SelectValue>{(value: UserRole) => USER_ROLE_LABEL[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GRANTABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {USER_ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Se crea como Admin.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-firstName">Nombre</Label>
                <Input
                  id="admin-firstName"
                  required
                  value={adminForm.firstName}
                  onChange={(e) => setAdminForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-lastName">Apellido</Label>
                <Input
                  id="admin-lastName"
                  required
                  value={adminForm.lastName}
                  onChange={(e) => setAdminForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-email">Correo</Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={adminForm.email}
                onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-phone">Teléfono</Label>
              <Input
                id="admin-phone"
                required
                value={adminForm.phoneNumber}
                onChange={(e) => setAdminForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                required
                minLength={8}
                value={adminForm.password}
                onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Mín. 8 caracteres, al menos una mayúscula y un número.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creando..." : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emailTarget !== null} onOpenChange={(open) => !open && setEmailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar correo</DialogTitle>
            <DialogDescription>
              {emailTarget &&
                `Esto cierra todas las sesiones activas de ${emailTarget.email} y le pide verificar el correo nuevo.`}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangeEmail();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-email">Correo nuevo</Label>
              <Input
                id="new-email"
                type="email"
                required
                autoFocus
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmailTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEmail}>
                {savingEmail ? "Guardando..." : "Cambiar correo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
