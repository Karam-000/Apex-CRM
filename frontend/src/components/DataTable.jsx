import { Plus, Filter, Search, Upload, Pencil, Trash2 } from 'lucide-react';

export default function DataTable({ title, columns, data, onAdd, onImport, onEdit, onDelete }) {
  const showActions = onEdit || onDelete;

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-md text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-shadow"
            />
          </div>
          <button className="p-2 border border-outline-variant rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Filter className="h-4 w-4" />
          </button>

          {onImport && (
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface bg-surface-container-lowest hover:bg-surface-container-high transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          )}

          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant"
                >
                  {col.header}
                </th>
              ))}
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-6 py-10 text-center text-outline">
                  No records yet.
                </td>
              </tr>
            )}
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-surface-container-low/40 transition-colors group">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-on-surface">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="p-1 text-outline hover:text-primary-600 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} className="p-1 text-outline hover:text-error transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
