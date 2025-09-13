"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type InputDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  value: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  loading?: boolean;
  minLength?: number;
};

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmText = "Create",
  cancelText = "Cancel",
  value,
  onValueChange,
  onConfirm,
  loading,
  minLength = 2,
}: InputDialogProps) {
  const isValid = value.trim().length >= minLength
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="small">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-2">
          {label ? (
            <label className="block text-sm mb-1">{label}</label>
          ) : null}
          <Input
            autoFocus
            value={value}
            placeholder={placeholder}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) onConfirm();
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading || !isValid}>
            {loading ? `${confirmText}...` : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
