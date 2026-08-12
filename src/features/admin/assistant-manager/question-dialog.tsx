"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { LocalizedEditor } from "@/features/admin/assistant-manager/localized-editor";
import { useT } from "@/components/providers/locale-provider";
import type { LocalizedText } from "@/lib/assistant/types";

const EMPTY: LocalizedText = { he: "", ar: "", en: "" };

export function SuggestedQuestionDialog({
  open,
  initial,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initial: LocalizedText | null;
  onOpenChange: (open: boolean) => void;
  onSave: (question: LocalizedText) => void;
}) {
  const t = useT();
  const [question, setQuestion] = useState<LocalizedText>(EMPTY);

  useEffect(() => {
    if (open) setQuestion(initial ? { ...initial } : { ...EMPTY });
  }, [initial, open]);

  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="sm">
      <AdminModalHeader onClose={() => onOpenChange(false)}>
        <AdminModalTitle>
          {initial ? t("admin.assistant.editQuestion") : t("admin.assistant.addQuestion")}
        </AdminModalTitle>
      </AdminModalHeader>
      <AdminModalBody>
        <LocalizedEditor value={question} onChange={setQuestion} requiredHe />
      </AdminModalBody>
      <AdminModalFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("admin.action.cancel")}
        </Button>
        <Button
          disabled={!question.he.trim()}
          onClick={() => {
            onSave(question);
            onOpenChange(false);
          }}
        >
          {initial ? t("admin.action.save") : t("admin.assistant.addQuestion")}
        </Button>
      </AdminModalFooter>
    </AdminModal>
  );
}
