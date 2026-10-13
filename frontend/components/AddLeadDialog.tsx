"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Building2, Loader2, Phone, Sparkles, User, X } from "lucide-react";
import Modal from "@/components/Modal";

export default function AddLeadDialog({
  open,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { name: string; company: string; phone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [shake, setShake] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setCompany("");
      setPhone("");
      setTouched(false);
      setShake(false);
      const t = setTimeout(() => nameRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setTouched(true);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      nameRef.current?.focus();
      return;
    }
    onSave({ name: name.trim(), company: company.trim(), phone: phone.trim() });
  };

  const invalid = touched && !name.trim();

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md" ariaLabelledBy="add-lead-title">
      <form onSubmit={submit} noValidate>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 id="add-lead-title" className="text-base font-bold tracking-tight text-[var(--ink)]">
                Add new lead
              </h2>
              <p className="text-[0.7rem] text-[var(--muted)]">Status starts at “New”</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-quiet btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`space-y-4 px-5 py-5 sm:px-6 ${shake ? "shake" : ""}`}>
          <div>
            <label className="label" htmlFor="lead-name">
              Full name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="lead-name"
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (invalid) setTouched(false);
                }}
                onBlur={() => setTouched(true)}
                placeholder="e.g., John Doe"
                aria-invalid={invalid}
                className={`field field-with-icon ${invalid ? "!border-red-400 !shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" : ""}`}
              />
            </div>
            {invalid && <p className="mt-1.5 text-[0.72rem] font-medium text-red-600">Name is required</p>}
          </div>

          <div>
            <label className="label" htmlFor="lead-company">
              Company <span className="opt">(optional)</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="lead-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Stark Industries"
                className="field field-with-icon"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="lead-phone">
              Phone <span className="opt">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 555-0123"
                inputMode="tel"
                className="field field-with-icon"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-[#fafbfd] px-5 py-4 sm:px-6">
          <span className="hidden text-[0.7rem] text-slate-400 sm:inline">
            <kbd>Enter</kbd> to save · <kbd>Esc</kbd> to cancel
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-quiet">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary">
              {saving && <Loader2 className="spin h-4 w-4" />} Save lead
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
