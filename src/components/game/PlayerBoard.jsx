import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Skull, Target, Heart, Shield, Sword, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PlayerBoard({ 
    player, 
    isCurrentPlayer, 
    isCurrentUser,
    canTarget, 
    onSelectTarget, 
    isSelected,
    isTargeted,
    isAttacker,
    isGhost
}) {
    const getHealthColor = (health) => {
        if (health <= 0) return 'text-red-500';
        if (health <= 5) return 'text-red-400';
        if (health <= 10) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getBorderColor = () => {
        if (player.isDisconnected) return 'border-gray-500 bg-gray-700/30';
        if (isGhost) return 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30';
        if (!player.isAlive) return 'border-red-800 bg-red-900/20';
        if (isTargeted) return 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20 ring-2 ring-red-500';
        if (isAttacker) return 'border-orange-500 bg-orange-500/10';
        if (isCurrentPlayer) return 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20';
        if (isCurrentUser) return 'border-blue-400 bg-blue-400/10';
        return 'border-gray-600 bg-gray-800/50';
    };

    const getCardBadgeStyle = (card) => {
        if (card.type === 'Black') {
            return 'bg-black text-yellow-300 border border-yellow-500';
        }
        if (card.deck === 'red') {
            return 'bg-red-800 text-red-100 border border-red-600';
        }
        if (card.deck === 'blue') {
            return 'bg-blue-800 text-blue-100 border border-blue-600';
        }
        return 'bg-gray-600 text-gray-100'; // Fallback
    };

    return (
        <motion.div
            layout
            animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
            className={`relative border-2 rounded-lg p-3 transition-all duration-300 ${getBorderColor()} ${player.isDisconnected ? 'opacity-60' : ''}`}
        >
            {isAttacker && <Sword className="absolute -top-3 -left-3 w-6 h-6 text-orange-400" title="Attacker" />}
            {isTargeted && <Shield className="absolute -top-3 -right-3 w-6 h-6 text-red-400" title="Targeted" />}
            {isGhost && <div className="absolute -top-2 -right-2 text-2xl" title="Ghost Form">👻</div>}
            {player.isDisconnected && <WifiOff className="absolute top-2 right-2 w-5 h-5 text-gray-400" title="Disconnected" />}
            {player.golemHealth > 0 && (
                <div className="absolute -top-2 -left-2 bg-gray-700 border border-yellow-500 rounded px-2 py-1 text-xs font-bold" title="Golem Shield">
                    🗿 {player.golemHealth}
                </div>
            )}
            {player.clericHealMode && <div className="absolute top-2 left-2 text-xl" title="Healing Mode">✨</div>}
            {player.cursedByWitch && <div className="absolute bottom-2 right-2 text-xl" title="Cursed">🔮</div>}

            {/* Player Avatar & Name */}
            <div className="flex items-center mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-2 text-sm ${
                    player.isDisconnected ? 'bg-gray-500 text-gray-300' :
                    player.isAlive ? (isGhost ? 'bg-purple-600 text-white' : 'bg-yellow-600 text-gray-900') : 'bg-gray-600 text-gray-400'
                }`}>
                    {player.isDisconnected ? <WifiOff className="w-5 h-5"/> : (player.isAlive ? (isGhost ? '👻' : player.fullName[0]) : <Skull className="w-5 h-5" />)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate text-sm ${player.isAlive ? 'text-white' : 'text-gray-500 line-through'}`}>
                        {player.fullName}
                        {isCurrentUser && <span className="text-blue-400 text-xs ml-1">(You)</span>}
                    </p>
                    {isCurrentPlayer && player.isAlive && !player.isDisconnected && (
                        <div className="flex items-center text-yellow-400 text-xs">
                            <Crown className="mr-1 h-3 w-3" />
                            Current Turn
                        </div>
                    )}
                    {isGhost && (
                        <div className="text-purple-400 text-xs">Ghost Form</div>
                    )}
                    {player.isDisconnected && (
                        <div className="text-gray-400 text-xs">Disconnected</div>
                    )}
                </div>
            </div>

            {/* Health */}
            <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                        <Heart className="mr-1 h-3 w-3 text-red-400" />
                        <span className="text-xs text-gray-300">Health</span>
                    </div>
                    <span className={`font-bold text-base ${getHealthColor(player.health)}`}>
                        {player.health}
                    </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                            player.health > 15 ? 'bg-green-500' :
                            player.health > 10 ? 'bg-yellow-500' :
                            player.health > 5 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(0, (player.health / 20) * 100)}%` }}
                    />
                </div>
            </div>

            {/* Face-up Cards */}
            <div className="mb-2 min-h-[30px]">
                <p className="text-xs text-gray-400 mb-1">Used:</p>
                <div className="flex flex-wrap gap-1">
                    {player.faceUpDiscards?.length > 0 ? (
                        player.faceUpDiscards.map((card, index) => (
                            <Badge key={`${card.id}-${index}`} className={`text-xs px-1 py-0 ${getCardBadgeStyle(card)}`}>
                                {card.name}
                            </Badge>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 italic">None</p>
                    )}
                </div>
            </div>

            {/* Hand Size */}
            <div className="text-xs text-gray-400">
                Cards in hand: {player.hand?.length || 0}
            </div>

            {/* Target Button */}
            {canTarget && (
                <Button 
                    onClick={onSelectTarget}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                    <Target className="mr-1 h-4 w-4" />
                    Attack
                </Button>
            )}

            {!player.isAlive && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <Skull className="w-8 h-8 text-red-400 mx-auto mb-1" />
                        <p className="text-red-400 font-bold text-sm">Eliminated</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}