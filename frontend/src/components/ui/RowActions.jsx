import { Pencil, Trash2 } from "lucide-react";

/** Edit / delete icon buttons used in table rows, plus optional extra buttons. */
export default function RowActions({ onEdit, onDelete, children }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      {onEdit && (
        <button type="button" onClick={onEdit} title="Edit" className="rounded-lg p-2 text-muted transition hover:bg-accent/10 hover:text-accent">
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} title="Delete" className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
