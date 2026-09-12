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
import { USER_ROLE_LABEL } from "@/types/users";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const ROLE_FILTER_OPTIONS: UserRole[] = ["USER", "ADMIN", "SUPER_ADMIN"];

const EMPTY_ADMIN_FORM: CreateAdminPayload = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
};

function roleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  if (role === "SUPER_ADMIN") return "default";
  if (role === "ADMIN") return "secondary";
  return "outline";
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
  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

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

  async function handleCreateAdmin() {
    setCreating(true);
    try {
      await userService.createAdmin(adminForm);
      toast.success("Cuenta admin creada — le llegó un correo para verificarla.");
      setCreateOpen(false);
      setAdminForm(EMPTY_ADMIN_FORM);
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

  async function handlePromote(target: ApiUser) {
    const ok = await confirm({
      title: `¿Promover a ${target.firstName} ${target.lastName} a admin?`,
      description: `${target.email} va a poder entrar a este panel de administración.`,
      confirmLabel: "Promover",
    });
    if (!ok) return;

    setBusyId(target.id);
    try {
      const updated = await userService.promoteToAdmin(target.id);
      setUsers((prev) => prev?.map((u) => (u.id === target.id ? updated : u)) ?? prev);
      toast.success(`${target.email} ahora es admin.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo promover a admin.");
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
          Crear cuenta admin
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
            setLoading(true);
            setRoleFilter((v as UserRole | "ALL") ?? "ALL");
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
                  const isAdminRow = u.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
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
                          {u.roles.map((r) => (
                            <Badge key={r} variant={roleBadgeVariant(r)}>
                              {USER_ROLE_LABEL[r]}
                            </Badge>
                          ))}
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
                        <div className="flex justify-end gap-2">
                          {!isAdminRow && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={busyId === u.id}
                              onClick={() => handlePromote(u)}
                            >
                              {busyId === u.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="size-3.5" />
                              )}
                              Promover
                            </Button>
                          )}
                          {isAdminRow && isSuperAdmin && (
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
            <DialogTitle>Crear cuenta admin</DialogTitle>
            <DialogDescription>
              Va a poder entrar a este panel con estos datos — nace sin verificar, como
              cualquier cuenta nueva.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateAdmin();
            }}
          >
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
