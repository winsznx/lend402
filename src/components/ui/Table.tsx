import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  emptyMessage?: string;
  className?: string;
}

export default function Table<T>({ columns, rows, emptyMessage = "No data", className = "" }: TableProps<T>) {
  return (
    <div className={"overflow-x-auto " + className}>
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {columns.map((c) => (
              <th key={c.key} className={"px-3 py-2 text-left text-[10px] uppercase tracking-widest text-slate-500 " + (c.className ?? "")}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                {columns.map((c) => (
                  <td key={c.key} className={"px-3 py-2 " + (c.className ?? "")}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
