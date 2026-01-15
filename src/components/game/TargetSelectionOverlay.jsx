import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function TargetSelectionOverlay({ players, onSelectTarget, actionText, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 p-4">
        {onCancel && (
            <Button onClick={onCancel} variant="ghost" size="icon" className="absolute top-4 right-4 text-gray-300 hover:text-white">
                <X className="h-6 w-6" />
            </Button>
        )}
        <h2 className="text-2xl font-bold text-yellow-300 mb-8 animate-pulse">{actionText}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {players.map(player => (
                <button
                    key={player.userId}
                    onClick={() => onSelectTarget(player.userId)}
                    className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-800 border-2 border-transparent hover:border-yellow-400 hover:bg-gray-700 transition-all transform hover:scale-105"
                >
                    <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center text-gray-900 font-bold text-2xl">
                        {player.fullName[0]}
                    </div>
                    <span className="text-white font-semibold">{player.fullName}</span>
                    <span className="text-green-400">HP: {player.health}</span>
                </button>
            ))}
        </div>
    </div>
  );
}