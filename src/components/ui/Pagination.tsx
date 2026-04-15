interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className={`flex items-center gap-1 ${className}`} aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded border border-slate-700 px-2 py-1 font-mono text-[10px] text-slate-400 transition-colors hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <span className="px-2 font-mono text-[10px] text-slate-500">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded border border-slate-700 px-2 py-1 font-mono text-[10px] text-slate-400 transition-colors hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </nav>
  );
}
