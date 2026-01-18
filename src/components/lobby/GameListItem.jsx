import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, LogIn, Loader2, Play } from 'lucide-react';

export default function GameListItem({ game, onJoin, isJoining, currentUserId }) {
    const isPlayerInGame = game.players.some(p => p.userId === currentUserId);
    const isInProgress = game.status === 'in_progress';
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between p-4 bg-gray-800/50 border border-yellow-800/40 rounded-lg shadow-md hover:bg-gray-800/80 transition-colors"
        >
            <div className="flex-1">
                <h4 className="font-bold text-lg text-yellow-100">{game.players[0]?.fullName}'s Game</h4>
                <div className="flex items-center text-sm text-gray-400 mt-1 space-x-3">
                    <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{game.players.length} / 10 players</span>
                    </div>
                    {isInProgress && (
                        <span className="text-green-400 font-semibold">• In Progress</span>
                    )}
                </div>
            </div>
            <Button
                onClick={() => onJoin(game.id)}
                disabled={isJoining || (game.players.length >= 10 && !isPlayerInGame)}
                className={` ${isPlayerInGame ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700 text-gray-900'} font-bold`}
            >
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : (isPlayerInGame ? <>
                    <Play className="mr-2 h-4 w-4" /> {isInProgress ? 'Rejoin' : 'Enter'}
                </> : <>
                    <LogIn className="mr-2 h-4 w-4" /> Join
                </>)}
            </Button>
        </motion.div>
    );
}