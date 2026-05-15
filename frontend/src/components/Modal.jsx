import { X } from 'lucide-react';
import clsx from 'clsx';

export default function Modal({ title, onClose, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={clsx('bg-white rounded-xl shadow-xl w-full max-h-[92vh] flex flex-col', widths[size])}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
