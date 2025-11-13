import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  X,
  Play,
  Save,
  FolderOpen,
  Cpu,
  Search,
  Eye,
  MousePointerClick,
  Code,
  Clock,
  Trash2,
  RotateCcw,
  Keyboard,
  Repeat,
  Pause,
  ExternalLink,
  Hash,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { Task, TaskType } from '../types/tasks';
import TaskCard from './TaskCard';
import { analyzeTaskSequence } from '../utils/taskOptimizer';
import { WebViewRef } from '../types';

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle: string;
  pageContent: string;
  currentURL: string;
  onExtractContent: () => void;
  webviewRef?: React.RefObject<WebViewRef>;
}

const ITEM_TYPE = 'TASK';

interface DraggableActionProps {
  type: TaskType;
  icon: React.ReactNode;
  label: string;
}

function DraggableAction({ type, icon, label }: DraggableActionProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { taskType: type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-[#2d2d2b] hover:bg-blue-600 hover:text-white transition-colors cursor-move ${isDragging ? 'opacity-50' : ''
        }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </div>
  );
}

interface DroppableTaskListProps {
  tasks: Task[];
  onDrop: (taskType: TaskType) => void;
}

function DroppableTaskList({ tasks, onDrop }: DroppableTaskListProps) {
  const { updateTask, removeTask, reorderTasks } = useTaskStore();

  const [, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { taskType: TaskType }) => {
      onDrop(item.taskType);
    },
  }));

  const moveTask = (dragIndex: number, hoverIndex: number) => {
    reorderTasks(dragIndex, hoverIndex);
  };

  return (
    <div
      ref={drop}
      className="h-full p-3 overflow-y-auto custom-scrollbar"
      style={{
        border: '2px dashed #3c3c3c',
        borderRadius: '8px',
        margin: '8px',
        minHeight: '150px',
      }}
    >
      {tasks.length === 0 ? (
        <div className="text-center text-gray-500 mt-6 text-xs">
          Drag actions here to build a sequence
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task, index) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              index={index}
              moveTask={moveTask}
              onUpdate={updateTask}
              onRemove={removeTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DraggableTaskCardProps {
  task: Task;
  index: number;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onRemove: (taskId: string) => void;
}

function DraggableTaskCard({ task, index, moveTask, onUpdate, onRemove }: DraggableTaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'TASK_CARD',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TASK_CARD',
    hover: (item: { index: number }) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      moveTask(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <TaskCard
        task={task}
        index={index}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    </div>
  );
}

export default function AISidebar({ isOpen, onClose, webviewRef }: AISidebarProps) {
  const { tasks, addTask, updateTask, clearTasks, loadSequence, executionStatus, setExecutionStatus, addLog, clearLogs } = useTaskStore();
  const [sequenceName, setSequenceName] = useState('');
  const [savedSequences, setSavedSequences] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  
  // Accordion state
  const [sectionsExpanded, setSectionsExpanded] = useState({
    actions: true,
    sequence: true,
    extractedData: false,
    logs: false,
  });

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Load saved sequences on mount
  useEffect(() => {
    if (isOpen) {
      loadSavedSequences();
    }
  }, [isOpen]);

  const loadSavedSequences = async () => {
    const result = await window.database.getAllSequences();
    if (result.success) {
      setSavedSequences(result.sequences || []);
    }
  };

  const handleDrop = (taskType: TaskType) => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: taskType,
      config: {},
      status: 'pending',
    };
    addTask(newTask);
  };

  const handleSaveSequence = async () => {
    if (!sequenceName.trim()) {
      alert('Please enter a sequence name');
      return;
    }

    const result = await window.database.saveSequence(sequenceName, tasks);
    if (result.success) {
      addLog(`Sequence "${sequenceName}" saved successfully`);
      setShowSaveDialog(false);
      setSequenceName('');
      loadSavedSequences();
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  };

  const handleLoadSequence = async (name: string) => {
    const result = await window.database.loadSequence(name);
    if (result.success && result.sequence) {
      loadSequence(result.sequence);
      addLog(`Loaded sequence "${name}"`);
      setShowLoadDialog(false);
    } else {
      alert(`Failed to load: ${result.error}`);
    }
  };

  const handleDeleteSequence = async (name: string) => {
    if (!confirm(`Delete sequence "${name}"?`)) return;

    const result = await window.database.deleteSequence(name);
    if (result.success) {
      addLog(`Deleted sequence "${name}"`);
      loadSavedSequences();
    } else {
      alert(`Failed to delete: ${result.error}`);
    }
  };

  const executeSequence = async () => {
    if (tasks.length === 0) {
      alert('No tasks to execute');
      return;
    }

    if (!webviewRef?.current) {
      alert('Webview not available');
      return;
    }

    // Check if last task is a Loop
    const lastTask = tasks[tasks.length - 1];
    const hasLoop = lastTask?.type === 'loop';
    const loopCount = hasLoop ? (lastTask.config.loopCount || 1) : 1;

    // Analyze sequence
    const analysis = analyzeTaskSequence(tasks);
    if (!analysis.isOptimal) {
      addLog('⚠️ Sequence analysis warnings:');
      analysis.suggestions.forEach(s => addLog(`  - ${s}`));
    }

    setExecutionStatus({
      isExecuting: true,
      isPaused: false,
      currentTaskIndex: 0,
      totalTasks: tasks.length,
      totalLoops: hasLoop ? loopCount : undefined,
    });
    clearLogs();
    addLog('🚀 Starting execution...');

    if (hasLoop) {
      addLog(`🔁 Sequence will loop ${loopCount} times`);
    }

    // Execute loops
    for (let loop = 0; loop < loopCount; loop++) {
      if (hasLoop && loop > 0) {
        addLog(`\\n🔁 Loop ${loop + 1}/${loopCount} - Restarting sequence`);
        setExecutionStatus({ currentLoop: loop + 1 });
      }

      // Context object to pass data between tasks (for chaining)
      let executionContext: any = {};

      // Execute all tasks except the Loop task itself
      const tasksToExecute = hasLoop ? tasks.slice(0, -1) : tasks;

      for (let i = 0; i < tasksToExecute.length; i++) {
        // Check if paused
        while (executionStatus.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const task = tasksToExecute[i];

        // Update task status to running and highlight it
        updateTask(task.id, { status: 'running' });
        setExecutionStatus({ currentTaskIndex: i });
        addLog(`▶️ Executing task ${i + 1}: ${task.type}`);

        try {
          // Pass context from previous task
          const result = await executeTask(task, webviewRef.current, executionContext);

          // Store result in context for next task
          if (result) {
            executionContext = { ...executionContext, ...result };
          }

          // Mark task as completed with checkmark
          updateTask(task.id, { status: 'completed', result });
          addLog(`✅ Task ${i + 1} completed`);
        } catch (error: any) {
          // Mark task as failed
          updateTask(task.id, { status: 'failed', error: error.message });
          addLog(`❌ Task ${i + 1} failed: ${error.message}`);
          setExecutionStatus({ isExecuting: false, isPaused: false });
          return;
        }

        // Small delay between tasks
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Small delay between loops
      if (loop < loopCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    addLog('🎉 All tasks executed successfully!');
    setExecutionStatus({ isExecuting: false, isPaused: false, currentTaskIndex: -1, currentLoop: undefined });
  };

  const executeTask = async (task: Task, webview: WebViewRef, context: any = {}): Promise<any> => {
    switch (task.type) {
      case 'search':
        if (!task.config.searchQuery) throw new Error('Search query is required');

        // Human-like delay before starting search
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300));

        // Visual border indicator
        await webview.executeJavaScript(`
        document.body.style.outline = '4px solid #3b82f6';
        document.body.style.outlineOffset = '-4px';
        setTimeout(() => {
          document.body.style.outline = '';
        }, 2000);
      `);

        // Use DuckDuckGo as default search engine
        const searchURL = `https://duckduckgo.com/?q=${encodeURIComponent(task.config.searchQuery)}`;
        webview.loadURL(searchURL);
        // Human-like delay for page load (2-3 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        return { lastSearchQuery: task.config.searchQuery };

      case 'find':
        // Human-like delay before finding
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));
        
        // ALWAYS stop any previous find operation to clear old highlights completely
        webview.stopFindInPage('clearSelection');
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
        
        // Force clear any existing highlights using JavaScript
        await webview.executeJavaScript(`
          (function() {
            // Remove any existing highlight styles
            document.querySelectorAll('[data-find-highlight]').forEach(el => {
              el.removeAttribute('data-find-highlight');
              el.style.backgroundColor = '';
              el.style.outline = '';
            });
            // Clear any selection
            if (window.getSelection) {
              window.getSelection().removeAllRanges();
            }
          })();
        `);
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));

        // Use findInPage for Ctrl+F style highlighting
        let textToFind = task.config.text || task.config.selector;

        // If no text specified but we have context from previous Find/Search, use that
        if (!textToFind && context.lastFoundText) {
          textToFind = context.lastFoundText;
          addLog(`  Using text from previous Find: "${textToFind}"`);
        }

        if (!textToFind) throw new Error('Text to find is required');

        addLog(`  🔍 Searching for: "${textToFind}"`);
        
        // Use Electron's findInPage API for Ctrl+F style highlighting (fresh search)
        webview.findInPage(textToFind, { forward: true, findNext: false });
        
        // Human-like delay for find to complete and wait for highlight
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

        // Scroll to the first match with human-like smooth scrolling
        const scrolled = await webview.executeJavaScript(`
          (async function() {
            const searchText = "${textToFind.replace(/"/g, '\\"')}";
            
            // Find all text nodes containing the search text
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  if (node.textContent && node.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                    return NodeFilter.FILTER_ACCEPT;
                  }
                  return NodeFilter.FILTER_SKIP;
                }
              }
            );
            
            let firstMatch = null;
            let node;
            while (node = walker.nextNode()) {
              const element = node.parentElement;
              if (element && element.offsetParent !== null) { // is visible
                firstMatch = element;
                break;
              }
            }
            
            if (firstMatch) {
              // Mark the element for tracking
              firstMatch.setAttribute('data-find-highlight', 'true');
              
              // Get element position for smooth human-like scrolling
              const rect = firstMatch.getBoundingClientRect();
              const absoluteTop = window.pageYOffset + rect.top;
              const middle = absoluteTop - (window.innerHeight / 2);
              
              // Human-like scroll with easing
              const startY = window.pageYOffset;
              const distance = middle - startY;
              const duration = 800 + Math.random() * 400; // 0.8-1.2 seconds
              const startTime = performance.now();
              
              function easeInOutQuad(t) {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
              }
              
              function animateScroll(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeInOutQuad(progress);
                
                window.scrollTo(0, startY + (distance * eased));
                
                if (progress < 1) {
                  requestAnimationFrame(animateScroll);
                }
              }
              
              requestAnimationFrame(animateScroll);
              
              // Wait for scroll to complete
              await new Promise(resolve => setTimeout(resolve, duration + 100));
              
              return { found: true, scrolled: true };
            }
            
            return { found: false, scrolled: false };
          })();
        `);

        if (scrolled && scrolled.found) {
          addLog(`  ✓ Found and scrolled to: "${textToFind}"`);
        } else {
          addLog(`  ⚠️ Text found but may not be visible: "${textToFind}"`);
        }

        // Human-like delay after finding
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

        // Return the found text for next task in chain
        return { lastFoundText: textToFind };

      case 'click':
        // Human-like delay before clicking
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300));
        
        // If Click comes after Find, auto-inherit the target
        let clickTarget = task.config.clickSelector;

        // Auto-click first link if previous task was Search (no Find in between)
        if (!clickTarget && !context.lastFoundText && context.lastSearchQuery) {
          addLog(`  🎯 Auto-clicking first link on search results`);
          webview.stopFindInPage('clearSelection');

          const clickFirstLinkCode = `
          (async function() {
            const links = Array.from(document.querySelectorAll('a')).filter(a =>
              a.href &&
              a.href.startsWith('http') &&
              !a.href.includes('duckduckgo.com') &&
              a.offsetParent !== null  // is visible
            );
            if (links.length > 0) {
              const firstLink = links[0];
              firstLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
              firstLink.click();
              return { success: true, url: firstLink.href };
            }
            throw new Error('No clickable links found');
          })();
        `;
          const result = await webview.executeJavaScript(clickFirstLinkCode);
          addLog(`  ✓ Clicked: ${result.url}`);
          // Human-like delay after click (0.5-1 second)
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
          return { ...context, clickedElement: result };
        }

        // If Click comes after Find, use existing auto-target logic
        if (!clickTarget && context.lastFoundText) {
          // Click should target the element that was found
          addLog(`  🎯 Auto-targeting element from previous Find: "${context.lastFoundText}"`);

          // Stop the find highlighting first
          webview.stopFindInPage('activateSelection');
          await new Promise(resolve => setTimeout(resolve, 300));

          // Click the first element that contains the found text
          const clickCode = `
          (async function() {
            const searchText = "${context.lastFoundText.replace(/"/g, '\\"')}";
            
            // Strategy 1: Find exact text matches (case-insensitive)
            const allElements = Array.from(document.querySelectorAll('*'));
            const matches = allElements.filter(el => {
              const text = (el.textContent || '').trim();
              // Only match if this element contains the text, not just its children
              const childText = Array.from(el.children).map(c => c.textContent || '').join('');
              const ownText = text.replace(childText, '').trim();
              return ownText.toLowerCase().includes(searchText.toLowerCase());
            });
            
            // Find the first clickable match
            for (const el of matches) {
              // Check if element is clickable
              const isClickable = el.tagName === 'A' || 
                                 el.tagName === 'BUTTON' || 
                                 el.onclick || 
                                 el.getAttribute('role') === 'button' ||
                                 el.getAttribute('role') === 'link' ||
                                 window.getComputedStyle(el).cursor === 'pointer';
              
              if (isClickable) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 400));
                el.click();
                return { success: true, element: el.tagName, text: el.textContent.substring(0, 50).trim() };
              }
              
              // Check if parent is clickable
              let parent = el.parentElement;
              let depth = 0;
              while (parent && depth < 5) {
                const isParentClickable = parent.tagName === 'A' || 
                                         parent.tagName === 'BUTTON' || 
                                         parent.onclick ||
                                         parent.getAttribute('role') === 'button' ||
                                         parent.getAttribute('role') === 'link';
                if (isParentClickable) {
                  parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(resolve => setTimeout(resolve, 400));
                  parent.click();
                  return { success: true, element: parent.tagName, text: parent.textContent.substring(0, 50).trim() };
                }
                parent = parent.parentElement;
                depth++;
              }
            }
            
            // Fallback: click the first match even if not obviously clickable
            if (matches.length > 0) {
              const el = matches[0];
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await new Promise(resolve => setTimeout(resolve, 400));
              el.click();
              return { success: true, element: el.tagName, text: el.textContent.substring(0, 50).trim() };
            }
            
            throw new Error('Element not found for clicking');
          })();
        `;
          try {
            const clickResult = await webview.executeJavaScript(clickCode);
            addLog(`  ✓ Clicked ${clickResult.element}: "${clickResult.text}..."`);
            // Human-like delay after auto-click (0.5-1 second)
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
            return { ...context, clickedElement: clickResult };
          } catch (err) {
            addLog(`  ⚠️ Auto-click failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            throw err;
          }
        } else if (clickTarget) {
          // Manual selector provided
          const clickCode = `
          (async function() {
            const el = document.querySelector("${clickTarget}");
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
              el.click();
              return true;
            } else {
              throw new Error('Element not found');
            }
          })();
        `;
          await webview.executeJavaScript(clickCode);
        } else {
          throw new Error('No click target specified and no context from previous Find/Search');
        }

        // Human-like delay after click (1-1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
        return context;

      case 'extract-dom':
        // Extract structured data
        const extractedData = await webview.executeJavaScript(`
        (function() {
          const results = [];

          // Extract links with text
          const links = Array.from(document.querySelectorAll('a')).filter(a =>
            a.href && a.textContent.trim() && a.offsetParent !== null
          ).slice(0, 10);  // Top 10 links

          links.forEach(link => {
            results.push({
              title: link.textContent.trim(),
              url: link.href,
              type: 'link'
            });
          });

          // Extract headings
          const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5);
          headings.forEach(h => {
            results.push({
              title: h.textContent.trim(),
              type: 'heading'
            });
          });

          return results;
        })()
      `);

        addLog(`📄 Extracted ${extractedData.length} items`);

        // Update execution status with extracted data for UI display
        setExecutionStatus({ extractedData });

        return { ...context, extractedData };

      case 'type':
        if (!task.config.typeText) throw new Error('Text to type is required');

        const targetField = task.config.targetField; // e.g., 'username', 'password', 'email'
        addLog(`  ⌨️ Typing: "${task.config.typeText}"${targetField ? ` into ${targetField}` : ''}`);

        // Human-like typing with click, focus, and character-by-character input
        const typeCode = `
        (async function() {
          let input;
          const targetField = "${targetField || ''}";
          const searchText = "${context.lastFoundText || ''}";
          const textToType = "${task.config.typeText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}";

          // 1. Try to find input by targetField (username, password, email, etc.)
          if (targetField) {
            // Try by name attribute
            input = document.querySelector('input[name*="' + targetField + '" i], input[id*="' + targetField + '" i]');

            // Try by type attribute
            if (!input && targetField === 'password') {
              input = document.querySelector('input[type="password"]');
            }
            if (!input && targetField === 'email') {
              input = document.querySelector('input[type="email"]');
            }

            // Try by placeholder text
            if (!input) {
              const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
              input = inputs.find(inp => {
                const placeholder = inp.getAttribute('placeholder') || '';
                const label = inp.labels?.[0]?.textContent || '';
                const text = (placeholder + ' ' + label).toLowerCase();
                return text.includes(targetField.toLowerCase());
              });
            }
          }

          // 2. Try to find input by previous Find text
          if (!input && searchText) {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
              if (node.textContent.includes(searchText)) {
                // Find nearest input field
                let el = node.parentElement;
                while (el && el !== document.body) {
                  const nearbyInput = el.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
                  if (nearbyInput) {
                    input = nearbyInput;
                    break;
                  }
                  el = el.parentElement;
                }
                if (input) break;
              }
            }
          }

          // 3. Fallback: find first visible input
          if (!input) {
            input = document.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
          }

          if (!input) {
            throw new Error('No input field found' + (targetField ? ' for ' + targetField : ''));
          }

          // Scroll to input and wait
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

          // Click the input field (human-like)
          input.click();
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

          // Focus the input
          input.focus();
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));

          // Clear existing value
          input.value = '';

          // Type character by character (human-like speed: 50-150ms per character)
          for (let i = 0; i < textToType.length; i++) {
            const char = textToType[i];
            input.value += char;
            
            // Trigger events for each character
            input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            
            // Random delay between 50-150ms (human typing speed)
            const delay = 50 + Math.random() * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Final change event
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Small delay after typing
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

          return {
            success: true,
            inputType: input.tagName,
            inputName: input.name || input.id || input.type || 'unknown'
          };
        })();
      `;

        const result = await webview.executeJavaScript(typeCode);
        addLog(`  ✓ Typed into ${result.inputName} (${result.inputType})`);
        return { ...context, typedText: task.config.typeText };

      case 'enter':
        addLog(`  ↵ Pressing Enter key`);
        
        // Human-like Enter key press
        await webview.executeJavaScript(`
          (async function() {
            // Find the currently focused element or the last input
            let target = document.activeElement;
            
            // If nothing is focused, try to find the last interacted input
            if (!target || target === document.body) {
              target = document.querySelector('input:focus, textarea:focus') || 
                       document.querySelector('input:not([type="hidden"]), textarea');
            }
            
            if (target) {
              // Small random delay before pressing (human-like)
              await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
              
              // Trigger Enter key events
              target.dispatchEvent(new KeyboardEvent('keydown', { 
                key: 'Enter', 
                code: 'Enter', 
                keyCode: 13, 
                which: 13, 
                bubbles: true 
              }));
              
              await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
              
              target.dispatchEvent(new KeyboardEvent('keypress', { 
                key: 'Enter', 
                code: 'Enter', 
                keyCode: 13, 
                which: 13, 
                bubbles: true 
              }));
              
              await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
              
              target.dispatchEvent(new KeyboardEvent('keyup', { 
                key: 'Enter', 
                code: 'Enter', 
                keyCode: 13, 
                which: 13, 
                bubbles: true 
              }));
              
              // Also try triggering form submit if inside a form
              const form = target.closest('form');
              if (form) {
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              }
              
              return { success: true, element: target.tagName };
            }
            
            throw new Error('No target element for Enter key');
          })();
        `);
        
        addLog(`  ✓ Enter key pressed`);
        // Human-like delay after Enter
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        return context;

      case 'scroll':
        const scrollAmount = task.config.scrollAmount || 500;
        addLog(`  📜 Scrolling ${scrollAmount}px`);
        
        // Human-like scrolling with easing animation
        await webview.executeJavaScript(`
          (async function() {
            const distance = ${scrollAmount};
            const duration = 800 + Math.random() * 400; // 0.8-1.2 seconds
            const startY = window.pageYOffset;
            const startTime = performance.now();
            
            // Easing function for smooth, human-like scrolling
            function easeInOutCubic(t) {
              return t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }
            
            function animateScroll(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = easeInOutCubic(progress);
              
              window.scrollTo(0, startY + (distance * eased));
              
              if (progress < 1) {
                requestAnimationFrame(animateScroll);
              }
            }
            
            requestAnimationFrame(animateScroll);
            
            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, duration + 50));
            
            return { scrolled: distance, finalY: window.pageYOffset };
          })();
        `);
        
        // Human-like delay after scroll (200-500ms)
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        return context;

      case 'wait':
        const waitTime = task.config.waitTime || 1000;
        addLog(`  ⏱️ Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return context;

      case 'loop':
        // Loop logic is handled at sequence level
        addLog(`🔁 Loop task - execution handled at sequence level`);
        return context;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  };

  if (!isOpen) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="w-96 flex flex-col text-gray-200"
        style={{ backgroundColor: '#232321', borderLeft: '1px solid #3c3c3c', height: '100%' }}
      >
        {/* Header */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded">
              <Cpu className="w-3 h-3 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Agentic Automation</h3>
              <p className="text-xs text-gray-400">Build & execute sequences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-[#3c3c3c]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Actions Palette - Accordion */}
        <div className="border-b border-[#3c3c3c]">
          <button
            onClick={() => toggleSection('actions')}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#2d2d2b] transition-colors"
          >
            <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              {sectionsExpanded.actions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Available Actions
            </h4>
          </button>
          {sectionsExpanded.actions && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-1.5">
                <DraggableAction type="search" icon={<Search className="w-3 h-3" />} label="Search" />
                <DraggableAction type="find" icon={<Eye className="w-3 h-3" />} label="Find" />
                <DraggableAction type="click" icon={<MousePointerClick className="w-3 h-3" />} label="Click" />
                <DraggableAction type="extract-dom" icon={<Code className="w-3 h-3" />} label="Extract" />
                <DraggableAction type="type" icon={<Keyboard className="w-3 h-3" />} label="Type" />
                <DraggableAction type="enter" icon={<CornerDownLeft className="w-3 h-3" />} label="Enter" />
                <DraggableAction type="wait" icon={<Clock className="w-3 h-3" />} label="Wait" />
                <DraggableAction type="scroll" icon={<Code className="w-3 h-3" />} label="Scroll" />
                <DraggableAction type="loop" icon={<Repeat className="w-3 h-3" />} label="Loop" />
              </div>
            </div>
          )}
        </div>

        {/* Task Sequence Area - Accordion */}
        <div className="border-b border-[#3c3c3c] flex-1 flex flex-col overflow-hidden">
          <button
            onClick={() => toggleSection('sequence')}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#2d2d2b] transition-colors"
          >
            <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              {sectionsExpanded.sequence ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Task Sequence ({tasks.length})
            </h4>
          </button>
          {sectionsExpanded.sequence && (
            <div className="flex-1 overflow-hidden">
              <DroppableTaskList tasks={tasks} onDrop={handleDrop} />
            </div>
          )}
        </div>

        {/* Extracted Data Panel - Accordion */}
        {executionStatus.extractedData && executionStatus.extractedData.length > 0 && (
          <div className="border-b border-[#3c3c3c]">
            <button
              onClick={() => toggleSection('extractedData')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#2d2d2b] transition-colors"
            >
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                {sectionsExpanded.extractedData ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Code className="w-3 h-3" />
                Extracted Data ({executionStatus.extractedData.length})
              </h4>
            </button>
            {sectionsExpanded.extractedData && (
              <div className="px-3 pb-2">
                <div className="bg-[#1f1f1f] rounded max-h-32 overflow-y-auto custom-scrollbar">
                  {executionStatus.extractedData.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        if (item.url && webviewRef?.current) {
                          webviewRef.current.loadURL(item.url);
                          addLog(`📍 Navigated to: ${item.title}`);
                        }
                      }}
                      className={`p-1.5 border-b border-[#3c3c3c] transition-colors ${
                        item.url ? 'hover:bg-[#2d2d2b] cursor-pointer' : ''
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        {item.type === 'link' && <ExternalLink className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />}
                        {item.type === 'heading' && <Hash className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-200 truncate">{item.title}</div>
                          {item.url && (
                            <div className="text-xs text-blue-400 truncate mt-0.5">{item.url}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execution Log - Accordion */}
        {executionStatus.logs.length > 0 && (
          <div className="border-b border-[#3c3c3c]">
            <button
              onClick={() => toggleSection('logs')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#2d2d2b] transition-colors"
            >
              <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                {sectionsExpanded.logs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Execution Log ({executionStatus.logs.length})
              </h4>
            </button>
            {sectionsExpanded.logs && (
              <div className="px-3 pb-2 max-h-20 overflow-y-auto custom-scrollbar">
                <div className="text-xs font-mono bg-[#1f1f1f] p-1.5 rounded space-y-0.5">
                  {executionStatus.logs.slice(-10).map((log, i) => (
                    <div key={i} className="text-gray-400 leading-tight">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3 border-t border-[#3c3c3c] space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={tasks.length === 0}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs transition-colors"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={() => setShowLoadDialog(true)}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs transition-colors"
            >
              <FolderOpen className="w-3 h-3" />
              Load
            </button>
            <button
              onClick={() => clearTasks()}
              disabled={tasks.length === 0}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* Pause/Resume Button */}
          {executionStatus.isExecuting && (
            <button
              onClick={() => setExecutionStatus({ isPaused: !executionStatus.isPaused })}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold transition-colors"
            >
              {executionStatus.isPaused ? (
                <>
                  <Play className="w-3 h-3" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  Pause
                </>
              )}
            </button>
          )}

          {/* Execute Button */}
          <button
            onClick={executeSequence}
            disabled={tasks.length === 0 || executionStatus.isExecuting}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs font-semibold transition-colors"
          >
            {executionStatus.isExecuting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="truncate">
                  {executionStatus.currentLoop && executionStatus.totalLoops ? (
                    `Loop ${executionStatus.currentLoop}/${executionStatus.totalLoops} - ${executionStatus.currentTaskIndex + 1}/${executionStatus.totalTasks}`
                  ) : (
                    `Running ${executionStatus.currentTaskIndex + 1}/${executionStatus.totalTasks}`
                  )}
                </span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Execute
              </>
            )}
          </button>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#232321] p-6 rounded-lg border border-[#3c3c3c] w-80">
              <h3 className="text-lg font-semibold mb-4">Save Sequence</h3>
              <input
                type="text"
                placeholder="Enter sequence name"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                className="w-full bg-[#2d2d2b] text-gray-200 px-3 py-2 rounded border border-[#3c3c3c] outline-none focus:border-blue-500 mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSequence}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSequenceName('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Dialog */}
        {showLoadDialog && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#232321] p-6 rounded-lg border border-[#3c3c3c] w-80 max-h-96 overflow-hidden flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Load Sequence</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4">
                {savedSequences.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No saved sequences
                  </div>
                ) : (
                  savedSequences.map((seq) => (
                    <div
                      key={seq.id}
                      className="flex items-center justify-between bg-[#2d2d2b] p-3 rounded hover:bg-[#3c3c3c]"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{seq.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(seq.updated_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadSequence(seq.name)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSequence(seq.name)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowLoadDialog(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
