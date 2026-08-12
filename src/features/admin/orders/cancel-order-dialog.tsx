"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { useT } from "@/components/providers/locale-provider";
import type { Order } from "@/types";

const REASONS = ["customer", "unavailable", "payment", "mistake", "other"] as const;

export function CancelOrderDialog({
  order,
  open,
  saving,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const t = useT();
  const [reason, setReason] = useState<(typeof REASONS)[number]>("customer");
  const [other, setOther] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("customer");
    setOther("");
  }, [open, order?.id]);

  return (
    <AdminDialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <AdminDialogContent size="sm">
        <AdminDialogHeader>
          <AdminDialogTitle>
            {t("admin.orders.cancelTitle").replace("{number}", order?.orderNumber ?? "")}
          </AdminDialogTitle>
        </AdminDialogHeader>
        <AdminDialogBody className="space-y-3">
          {REASONS.map((value) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-beige-dark/20 px-3 py-2"
            >
              <input
                type="radio"
                name="cancel-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              <span>{t(`admin.orders.cancelReason.${value}`)}</span>
            </label>
          ))}
          {reason === "other" && (
            <Textarea
              value={other}
              onChange={(event) => setOther(event.target.value)}
              placeholder={t("admin.orders.cancelReasonPlaceholder")}
              className="min-h-20"
            />
          )}
        </AdminDialogBody>
        <AdminDialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {t("common.back")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving || (reason === "other" && !other.trim())}
            onClick={() =>
              onConfirm(reason === "other" ? other.trim() : t(`admin.orders.cancelReason.${reason}`))
            }
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("admin.orders.cancel")}
          </Button>
        </AdminDialogFooter>
      </AdminDialogContent>
    </AdminDialog>
  );
}
