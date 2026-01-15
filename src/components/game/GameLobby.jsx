
import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Users, Play, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GameLobby({ game, user, onStartGame }) {
    const isHost = game.hostId === user?.id;
    // Need at least 3 players for proper testing
    const canStart = game.players.length >= 3;

    const getExpansionBadge = (exp) => {
        const colors = {
            exp1: 'bg-blue-100 text-blue-800',
            exp2: 'bg-purple-100 text-purple-800', 
            exp3: 'bg-red-100 text-red-800'
        };
        
        const names = {
            exp1: 'Expansion 1',
            exp2: 'Expansion 2 (Black)',
            exp3: 'Expansion 3 (Black)'
        };
        
        return (
            <Badge key={exp} className={colors[exp] || 'bg-gray-100 text-gray-800'}>
                {names[exp]}
            </Badge>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-yellow-100 mb-2">Game Lobby</h2>
                <p className="text-gray-300">Waiting for players to join...</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Players List */}
                <div className="bg-gray-800/50 border border-yellow-800/40 rounded-lg p-6">
                    <h3 className="flex items-center text-xl font-bold text-yellow-400 mb-4">
                        <Users className="mr-2 h-5 w-5" />
                        Players ({game.players.length}/10)
                    </h3>
                    <div className="space-y-3">
                        {game.players.map((player, index) => (
                            <div key={player.userId} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-gray-900 font-bold mr-3">
                                        {player.fullName[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{player.fullName}</p>
                                        {player.userId === game.hostId && (
                                            <div className="flex items-center text-yellow-400 text-sm">
                                                <Crown className="mr-1 h-3 w-3" />
                                                Host
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <UserCheck className="h-5 w-5 text-green-400" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Game Settings */}
                <div className="bg-gray-800/50 border border-yellow-800/40 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4">Game Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-300 mb-2 font-semibold">Card Sets:</p>
                            <div className="space-y-2">
                                <Badge className="bg-green-100 text-green-800 mr-2">Original Game (Always On)</Badge>
                                {game.enabledExpansions?.length > 0 ? 
                                    game.enabledExpansions.map(getExpansionBadge) :
                                    <p className="text-gray-500 text-sm">No expansions selected</p>
                                }
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-gray-300 mb-2 font-semibold">Game Rules:</p>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• Each player starts with 20 health</li>
                                <li>• Roll 2 coins + 1 D8 each turn</li>
                                <li>• HH = Attack, TT = Self-Hit, Mixed = Pass</li>
                                <li>• One card per turn (unless stated otherwise)</li>
                                <li>• Last player standing wins!</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Start Game Button */}
            <div className="text-center mt-8">
                {isHost ? (
                    <Button 
                        size="lg"
                        onClick={onStartGame}
                        disabled={!canStart}
                        className="bg-green-600 hover:bg-green-700 text-white text-xl font-bold px-8 py-4"
                    >
                        <Play className="mr-2 h-6 w-6" />
                        {canStart ? 'Start Game' : `Need ${3 - game.players.length} more players`}
                    </Button>
                ) : (
                    <div className="text-gray-400">
                        <p>Waiting for {game.players.find(p => p.userId === game.hostId)?.fullName} to start the game...</p>
                        <p className="text-sm mt-1">{canStart ? 'Ready to start!' : `Need ${3 - game.players.length} more players`}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
