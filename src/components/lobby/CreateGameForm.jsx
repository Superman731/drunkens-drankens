
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const expansions = [
  { id: 'exp1', name: 'Expansion 1 (Black Cards)' },
  { id: 'exp2', name: 'Expansion 2 (Regular Cards)' },
  { id: 'exp3', name: 'Expansion 3 (Black Cards)' },
];

export default function CreateGameForm({ onSubmit, isCreating }) {
  const [selectedExpansions, setSelectedExpansions] = useState([]);

  const handleToggleExpansion = (expId) => {
    setSelectedExpansions(prev =>
      prev.includes(expId)
        ? prev.filter(id => id !== expId)
        : [...prev, expId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedExpansions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div>
        <h4 className="font-semibold text-lg text-gray-300 mb-3">Card Sets</h4>
        <div className="p-4 rounded-md border border-gray-700 bg-gray-900/50 space-y-3">
            <div className="flex items-center space-x-2">
                <Checkbox id="og-set" checked disabled />
                <Label htmlFor="og-set" className="text-gray-400">Original Game (Always On)</Label>
            </div>
            {expansions.map(exp => (
              <div key={exp.id} className="flex items-center space-x-2">
                <Checkbox
                  id={exp.id}
                  checked={selectedExpansions.includes(exp.id)}
                  onCheckedChange={() => handleToggleExpansion(exp.id)}
                  className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                />
                <Label htmlFor={exp.id} className="cursor-pointer">{exp.name}</Label>
              </div>
            ))}
        </div>
      </div>
      <Button type="submit" disabled={isCreating} className="w-full bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-bold text-base">
        {isCreating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          'Create & Enter Lobby'
        )}
      </Button>
    </form>
  );
}
