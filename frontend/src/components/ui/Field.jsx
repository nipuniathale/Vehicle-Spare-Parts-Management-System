/** Label + control + validation message. */
export default function Field({ label, error, hint, required, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

export function Input({ error, className = "", ...props }) {
  return <input className={`input ${error ? "input-error" : ""} ${className}`} {...props} />;
}

export function Textarea({ error, className = "", rows = 3, ...props }) {
  return <textarea rows={rows} className={`input resize-none ${error ? "input-error" : ""} ${className}`} {...props} />;
}

export function Select({ error, className = "", options = [], placeholder, ...props }) {
  return (
    <select className={`input ${error ? "input-error" : ""} ${className}`} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
      <input type="checkbox" className="h-4 w-4 rounded border-line accent-accent" {...props} />
      {label}
    </label>
  );
}
