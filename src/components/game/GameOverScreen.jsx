import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GameOverScreen({ winner }) {
  const navigate = useNavigate();
  const handleReturnToLobby = () => {
    navigate(createPageUrl('Lobby'));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 text-center p-4">
      <Trophy className="w-24 h-24 text-yellow-400 mb-6" />
      <h2 className="text-4xl md:text-6xl font-bold text-yellow-100 mb-4">Game Over</h2>
      
      {winner && winner.userId !== 'aborted' && winner.userId !== 'draw' ? (
        <div className="flex items-center justify-center space-x-3">
          <Crown className="w-10 h-10 text-yellow-400" />
          <p className="text-2xl md:text-3xl text-white">
            <span className="font-bold text-yellow-300">{winner.fullName}</span> is victorious!
          </p>
        </div>
      ) : (
        <p className="text-2xl text-gray-400">
          {winner?.fullName === 'Game Aborted' ? 'The game was aborted.' : 'The battle ends in a draw!'}
        </p>
      )}

      <Button 
        size="lg"
        onClick={handleReturnToLobby}
        className="mt-12 bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-bold text-lg"
      >
        Return to Lobby
      </Button>
    </div>
  );
}