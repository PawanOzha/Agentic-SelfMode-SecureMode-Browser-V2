import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AgentBarProps {
  isRunning: boolean;
  onToggleRun: (prompt: string) => void;
  aiSidebarOpen?: boolean;
}

export default function AgentBar({
  isRunning,
  onToggleRun,
  aiSidebarOpen = false,
}: AgentBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onToggleRun(input.trim());
    }
  };

  return (
    <div
      className="fixed bottom-6 z-[10001] transition-all duration-300 ease-in-out"
      style={{
        left: '50%',
        transform: aiSidebarOpen ? 'translateX(calc(-50% - 200px))' : 'translateX(-50%)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(35, 35, 33, 0.95)',
          border: '1px solid rgba(60, 60, 60, 0.5)',
          minWidth: '500px',
          maxWidth: '600px',
        }}
      >
        <Sparkles
          className="w-4 h-4 flex-shrink-0"
          style={{
            color: '#22c55e',
            filter: isRunning ? 'drop-shadow(0 0 6px rgba(34,197,94,0.9))' : 'none',
            transition: 'filter 0.2s ease'
          }}
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI agent..."
          className="flex-1 bg-transparent text-gray-200 text-sm outline-none placeholder-gray-500"
          style={{ minWidth: 0 }}
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex-shrink-0"
          style={{
            backgroundColor: isRunning ? '#f59e0b' : '#22c55e',
            color: '#0a0a0a',
            boxShadow: isRunning ? '0 0 12px rgba(245, 158, 11, 0.4)' : '0 0 12px rgba(34, 197, 94, 0.4)',
          }}
        >
          {isRunning ? 'Pause' : 'Run'}
        </button>
      </form>
    </div>
  );
}

