import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

export function DataTable<TData>({ data, columns }: { data: TData[]; columns: ColumnDef<TData>[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 font-semibold">{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-slate-500" colSpan={columns.length}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
