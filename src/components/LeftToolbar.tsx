import React, { useState } from 'react';
import { MousePointer2, Crosshair, Minus, Divide, Type, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LeftToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  onDeleteAll: () => void;
}

export function LeftToolbar({ activeTool, setActiveTool, onDeleteAll }: LeftToolbarProps) {
  const tools = [
    { id: 'cursor', icon: MousePointer2, label: 'Cursor' },
    { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
    { divider: true },
    { id: 'trendline', icon: Minus, label: 'Trend Line', rotate: 45 },
    { id: 'horizontal', icon: Minus, label: 'Horizontal Line' },
    { divider: true },
    { id: 'text', icon: Type, label: 'Text' },
    { divider: true },
    { id: 'delete', icon: Trash2, label: 'Remove Drawings' }
  ];

  return (
    <div className="w-12 border-r border-neutral-800 bg-[#0a0a0a] flex flex-col items-center py-2 gap-1 shrink-0 z-50 overflow-y-auto">
      {tools.map((t, i) => {
        if (t.divider) {
          return <div key={`div-${i}`} className="w-6 h-px bg-neutral-800 my-1" />;
        }
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'delete') {
                onDeleteAll();
              } else {
                setActiveTool(t.id as string);
              }
            }}
            title={t.label}
            className={cn(
               "p-2 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors relative group",
               isActive && "text-blue-500 bg-neutral-800/50"
            )}
          >
            <Icon className="w-5 h-5" style={t.rotate ? { transform: `rotate(-${t.rotate}deg)` } : undefined} />
            <div className="absolute left-full ml-2 px-2 py-1 bg-black border border-neutral-700 text-xs text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl">
              {t.label}
            </div>
          </button>
        )
      })}
    </div>
  );
}
