import { useEffect, useState } from 'react';

interface BookmarkItem {
  id: number;
  title: string;
  url: string;
  created_at: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onNavigate }: SettingsModalProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await (window as any).bookmarks?.getAll?.();
      if (res?.success) {
        setBookmarks(res.bookmarks || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen]);

  const handleRemove = async (url: string) => {
    const res = await (window as any).bookmarks?.remove?.(url);
    if (res?.success) {
      setBookmarks(prev => prev.filter(b => b.url !== url));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex" style={{ backgroundColor: '#141413' }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4" style={{ backgroundColor: '#232321', borderBottom: '1px solid #3c3c3c' }}>
        <div className="text-gray-200 font-medium">Settings</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">Close</button>
      </div>

      {/* Body */}
      <div className="flex w-full pt-12">
        {/* Left nav (tabs) */}
        <div className="w-64 border-r p-4" style={{ borderColor: '#3c3c3c', backgroundColor: '#1b1b1a' }}>
          <div className="text-xs uppercase text-gray-500 mb-3">Sections</div>
          <div className="text-sm text-gray-200 font-medium">Bookmarks</div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="text-gray-200 font-medium mb-4">Bookmarks</div>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : bookmarks.length === 0 ? (
            <div className="text-gray-400 text-sm">No bookmarks yet.</div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: '#232321', border: '1px solid #3c3c3c' }}>
                  <div className="min-w-0 mr-3">
                    <div className="text-gray-100 text-sm truncate">{b.title}</div>
                    <div className="text-gray-500 text-xs truncate">{b.url}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { onNavigate(b.url); onClose(); }}
                      className="text-gray-300 text-xs px-2 py-1 rounded"
                      style={{ border: '1px solid #3c3c3c' }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleRemove(b.url)}
                      className="text-red-400 text-xs px-2 py-1 rounded hover:text-white"
                      style={{ border: '1px solid #3c3c3c' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

