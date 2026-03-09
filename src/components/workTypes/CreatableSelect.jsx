import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";

export default function CreatableSelect({ value, onValueChange, options, setOptions, placeholder }) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (!options.includes(trimmed)) setOptions([...options, trimmed]);
    onValueChange(trimmed);
    setNewValue("");
    setAdding(false);
  };

  return (
    <div className="space-y-1.5">
      {!adding ? (
        <div className="flex gap-1.5">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Ninguno</SelectItem>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={() => setAdding(true)} title="Agregar nuevo">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Input
            autoFocus
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder="Nuevo valor..."
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleAdd}>
            <Check className="w-4 h-4 text-emerald-600" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => setAdding(false)}>
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}