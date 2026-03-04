import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function SubtaskList({ subtasks = [], onChange, readOnly = false }) {
  const [newTitle, setNewTitle] = useState("");

  const addSubtask = () => {
    if (!newTitle.trim()) return;
    onChange([...subtasks, { id: generateId(), title: newTitle.trim(), completed: false }]);
    setNewTitle("");
  };

  const toggle = (id) => {
    onChange(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const remove = (id) => {
    onChange(subtasks.filter(s => s.id !== id));
  };

  const done = subtasks.filter(s => s.completed).length;
  const pct = subtasks.length > 0 ? Math.round((done / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-2">
      {subtasks.length > 0 && (
        <>
          <div className="space-y-1.5">
            {subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 group">
                <Checkbox
                  checked={s.completed}
                  onCheckedChange={() => !readOnly && toggle(s.id)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  disabled={readOnly}
                />
                <span className={`flex-1 text-sm ${s.completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {s.title}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{done}/{subtasks.length} completadas</span>
              <span className="font-medium text-emerald-600">{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Agregar subtarea..."
            className="flex-1 h-8 text-sm"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
          />
          <Button type="button" size="sm" variant="outline" onClick={addSubtask} className="h-8 px-3">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}