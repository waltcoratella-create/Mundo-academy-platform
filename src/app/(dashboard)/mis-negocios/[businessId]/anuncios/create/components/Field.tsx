"use client";

import { useId } from "react";

/**
 * Thin label/help/error wrapper around the global `.input-base` utility. Not a
 * new design primitive — it only wires the a11y plumbing (label htmlFor,
 * aria-invalid, aria-describedby, role="alert") that every step needs.
 */
export function Field({
  label,
  htmlFor,
  error,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="adsc-field">
      <label className="adsc-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {help && !error && <span className="adsc-help">{help}</span>}
      {error && <span className="adsc-error" role="alert">{error}</span>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  help,
  placeholder,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  help?: string;
  placeholder?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <Field label={label} htmlFor={id} error={error} help={help}>
      <input
        id={id}
        type={type}
        className="input-base"
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  help,
  placeholder,
  rows = 3,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  help?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} error={error} help={help}>
      <textarea
        id={id}
        className="input-base"
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  help?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} error={error} help={help}>
      <select
        id={id}
        className="input-base"
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

/** Step heading — title + optional hint, shared by all six steps. */
export function StepHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="adsc-step-title">{title}</h2>
      {hint && <p className="adsc-step-hint">{hint}</p>}
    </div>
  );
}
