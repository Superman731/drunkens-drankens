import React from 'react';
import { AnimatePresence } from 'framer-motion';
import GameListItem from './GameListItem';

export default function GameList({ games, onJoin, isJoining, currentUserId }) {
    if (!games || games.length === 0) {
        return (
            <div className="text-center py-10 px-4 border-2 border-dashed border-gray-700 rounded-lg">
                <p className="text-gray-400">No open games at the moment.</p>
                <p className="text-gray-500 text-sm mt-1">Why not create one?</p>
            </div>
        );
    }
  
    return (
        <div className="space-y-3">
            <AnimatePresence>
                {games.map(game => (
                    <GameListItem 
                        key={game.id} 
                        game={game} 
                        onJoin={onJoin}
                        isJoining={isJoining}
                        currentUserId={currentUserId}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}