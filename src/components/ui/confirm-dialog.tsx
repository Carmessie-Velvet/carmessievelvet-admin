"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta el botón de confirmar en rojo — para acciones destructivas (eliminar, cancelar). */
  destructive?: boolean;
}

interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
}

type PendingRequest =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

interface ConfirmDialogContextValue {
  /** Reemplazo con estilo propio de `window.confirm` — resuelve `true`/`false`. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Reemplazo con estilo propio de `window.prompt` — resuelve el texto o `null` si se canceló. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

/**
 * Monta un único diálogo modal (con la marca de la app, no el `alert()`
 * gris del navegador) y lo expone vía `useConfirmDialog()` — pedido
 * explícito de la clienta para no perder personalización en las
 * confirmaciones de eliminar/cancelar. Vive una sola vez en el layout raíz,
 * igual que el `<Toaster />` de sonner.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ kind: "confirm", options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(options.defaultValue ?? "");
      setRequest({ kind: "prompt", options, resolve });
    });
  }, []);

  function settle(value: boolean | string | null) {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(Boolean(value));
    else request.resolve(value as string | null);
    setRequest(null);
  }

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);
  const cancelValue = request?.kind === "confirm" ? false : null;

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => {
          if (!open) settle(cancelValue);
        }}
      >
        {request && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{request.options.title}</DialogTitle>
              {request.options.description && (
                <DialogDescription>{request.options.description}</DialogDescription>
              )}
            </DialogHeader>

            {request.kind === "prompt" && (
              <Input
                autoFocus
                value={promptValue}
                placeholder={request.options.placeholder}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") settle(promptValue);
                }}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => settle(cancelValue)}>
                {request.options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                type="button"
                variant={request.kind === "confirm" && request.options.destructive ? "destructive" : "default"}
                onClick={() => settle(request.kind === "confirm" ? true : promptValue)}
              >
                {request.options.confirmLabel ?? "Aceptar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmDialogContextValue {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog debe usarse dentro de <ConfirmDialogProvider>");
  }
  return ctx;
}
