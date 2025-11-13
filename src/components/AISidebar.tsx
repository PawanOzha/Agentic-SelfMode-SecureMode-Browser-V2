import { useState } from "react";
import {
  X,
  Cpu,
  Search,
  MousePointerClick,
  Eye,
  Code,
  Play
} from "lucide-react";

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AISidebar({ isOpen, onClose }: AISidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);

  // --- Drag Logic ---
  const handleDragStart = (e: React.DragEvent, task: string) => {
    e.dataTransfer.setData("task", task);
  };

  const handleDrop = (e: React.DragEvent) => {
    const task = e.dataTransfer.getData("task");
    setTasks((prev) => [...prev, task]);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // --- Execution Logic ---
  const executeTask = async (task: string, index: number) => {
    console.log(`Executing ${index + 1}: ${task}`);
    if (task === "Search") {
      if (!searchQuery) {
        alert("Please enter a search term first.");
        return;
      }
      // Simulated browser search
      console.log(`Searching web for: ${searchQuery}`);
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, "_blank");
    } else if (task === "Find") {
      alert("Simulating: Find element on page...");
    } else if (task === "Click") {
      alert("Simulating: Click element...");
    } else if (task === "Extract DOM") {
      alert("Simulating: Extracting DOM content...");
    }
  };

  const executeAll = async () => {
    for (let i = 0; i < tasks.length; i++) {
      await executeTask(tasks[i], i);
      await new Promise((res) => setTimeout(res, 1000)); // small delay
    }
    alert("✅ All tasks executed in sequence!");
  };

  if (!isOpen) return null;

  return (
    <div
      className="w-96 flex flex-col text-gray-200"
      style={{ backgroundColor: "#232321", borderLeft: "1px solid #3c3c3c" }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Agent Tasks</h3>
            <p className="text-xs text-gray-400">Drag, drop, and execute</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-[#3c3c3c]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-[#3c3c3c]">
        <label className="block text-xs text-gray-400 mb-1">Search Query</label>
        <input
          type="text"
          placeholder="e.g. Gojo"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#2d2d2b] text-sm text-gray-200 p-2 rounded-lg outline-none"
        />
      </div>

      {/* Draggable Actions */}
      <div className="p-4 border-b border-[#3c3c3c]">
        <h4 className="text-sm font-semibold mb-3 text-gray-300">
          Available Actions
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Search", icon: <Search className="w-4 h-4" /> },
            { name: "Find", icon: <Eye className="w-4 h-4" /> },
            { name: "Click", icon: <MousePointerClick className="w-4 h-4" /> },
            { name: "Extract DOM", icon: <Code className="w-4 h-4" /> },
          ].map((item) => (
            <div
              key={item.name}
              draggable
              onDragStart={(e) => handleDragStart(e, item.name)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2d2d2b] hover:bg-blue-600 hover:text-white transition-colors cursor-move"
            >
              {item.icon}
              <span className="text-sm">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Droppable Area */}
      <div
        className="flex-1 p-4 overflow-y-auto"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: "2px dashed #3c3c3c",
          borderRadius: "10px",
          margin: "12px",
          minHeight: "200px",
        }}
      >
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500 mt-8 text-sm">
            Drag actions here to build a sequence
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-[#2d2d2b] px-3 py-2 rounded-lg"
              >
                <span className="text-sm">
                  <b>{idx + 1}.</b> {task}
                </span>
                <button
                  onClick={() =>
                    setTasks((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Execute Button */}
      <div className="p-4 border-t border-[#3c3c3c]">
        <button
          onClick={executeAll}
          disabled={tasks.length === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm transition-colors"
        >
          <Play className="w-4 h-4" />
          Execute Sequence
        </button>
      </div>
    </div>
  );
}
