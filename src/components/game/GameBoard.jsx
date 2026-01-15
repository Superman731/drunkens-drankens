import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skull, Heart, Dices } from 'lucide-react';
import PlayerBoard from './PlayerBoard';
import DiceRoller from './DiceRoller';
import CardHand from './CardHand';
import GameLog from './GameLog';
import ReactionWindow from './ReactionWindow';
import GameOverScreen from './GameOverScreen';
import TargetSelectionOverlay from './TargetSelectionOverlay';

export default function GameBoard({ game, user, onGameAction, isActionInProgress }) {
    const [isRolling, setIsRolling] = useState(false);
    
    const currentPlayer = game.players[game.currentPlayerIndex];
    const isCurrentPlayer = currentPlayer?.userId === user?.id;
    const userPlayer = game.players.find(p => p.userId === user?.id);
    const alivePlayers = game.players.filter(p => p.isAlive);

    // Check if user is in ghost state
    const isGhost = userPlayer?.ghostState?.active || false;

    const handleRoll = async () => {
        if (!isCurrentPlayer || isRolling || isActionInProgress) return;
        setIsRolling(true);
        await onGameAction({ type: 'ROLL_DICE' });
        setTimeout(() => setIsRolling(false), 1500);
    };

    const handleSelectTarget = async (targetId) => {
        if (!isCurrentPlayer || isActionInProgress) return;
        await onGameAction({ type: 'SELECT_TARGET', payload: { targetId } });
    };

    const handlePlayCard = (card, targetId) => {
        if (isActionInProgress) return;
        onGameAction({ type: 'PLAY_CARD', payload: { playerId: user.id, cardId: card.id, targetId } });
    };

    const handleEndTurn = async () => {
        if (!isCurrentPlayer || isActionInProgress) return;
        await onGameAction({ type: 'END_TURN' });
    };
    
    const canShowReactionWindow = () => {
        return game.turnPhase === 'reaction' && 
               game.reactingPlayerId === user?.id && 
               userPlayer?.isAlive;
    };

    // Auto-handle disconnected players in reaction phase
    useEffect(() => {
        if (game.turnPhase === 'reaction' && game.reactingPlayerId) {
            const reactingPlayer = game.players.find(p => p.userId === game.reactingPlayerId);
            if (reactingPlayer?.isDisconnected) {
                // Auto drink and pass for disconnected player after a short delay
                const timeout = setTimeout(() => {
                    onGameAction({ 
                        type: 'DRINK_AND_PASS', 
                        payload: { playerId: game.reactingPlayerId } 
                    });
                }, 1000);
                return () => clearTimeout(timeout);
            }
        }
    }, [game.turnPhase, game.reactingPlayerId, game.players, onGameAction]);
    
    if (game.status === 'finished') {
        return <GameOverScreen winner={game.winner} />;
    }

    const showTargetSelection = game.turnPhase === 'target_selection' && isCurrentPlayer;
    const showRollResult = game.rollResult && !isRolling;
    const showEndTurnButton = game.turnPhase === 'finished_turn' && isCurrentPlayer;

    return (
        <div className="space-y-6">
            <div className="text-center bg-gray-800/50 border border-yellow-800/40 rounded-lg p-4">
                <div className="flex justify-center items-center space-x-6 mb-2">
                    <div className="flex items-center text-green-400">
                        <Heart className="mr-1 h-4 w-4" />
                        <span>{alivePlayers.length} alive</span>
                    </div>
                    <div className="text-yellow-400 font-bold text-lg">
                        {game.turnPhase === 'game_over' ? 'Game Over' : (currentPlayer?.isAlive ? `${currentPlayer?.fullName}'s Turn` : "Waiting for next turn...")}
                    </div>
                    <div className="flex items-center text-red-400">
                        <Skull className="mr-1 h-4 w-4" />
                        <span>{game.players.length - alivePlayers.length} eliminated</span>
                    </div>
                </div>
                {isGhost && (
                    <div className="text-purple-400 font-bold">👻 You are in Ghost Form - Unattackable</div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {game.players.map((player, index) => (
                    <PlayerBoard 
                        key={player.userId}
                        player={player}
                        isCurrentPlayer={index === game.currentPlayerIndex}
                        isCurrentUser={player.userId === user?.id}
                        isTargeted={player.userId === game.targetId && game.turnPhase === 'reaction'}
                        isAttacker={player.userId === game.attackerId && game.turnPhase === 'reaction'}
                        isGhost={player.ghostState?.active || false}
                    />
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-gray-800/50 border border-yellow-800/40 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
                            <Dices className="mr-2 h-5 w-5" />
                            Dice & Actions
                        </h3>
                        
                        <DiceRoller 
                            rollResult={showRollResult ? game.rollResult : null}
                            isRolling={isRolling}
                            canRoll={isCurrentPlayer && game.turnPhase === 'rolling'}
                            onRoll={handleRoll}
                            isActionInProgress={isActionInProgress}
                        />

                        {showEndTurnButton && (
                            <div className="mt-4 text-center">
                                <Button
                                    onClick={handleEndTurn}
                                    disabled={isActionInProgress}
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4"
                                >
                                    End Turn
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <GameLog log={game.gameLog || []} />
                </div>
            </div>

            {userPlayer && userPlayer.isAlive && (
                <CardHand 
                    cards={userPlayer.hand || []}
                    game={game}
                    user={user}
                    onPlayCard={handlePlayCard}
                    isActionInProgress={isActionInProgress}
                />
            )}

            {canShowReactionWindow() && (
                <ReactionWindow
                    game={game}
                    userPlayer={userPlayer}
                    onGameAction={onGameAction}
                    isActionInProgress={isActionInProgress}
                />
            )}

            {showTargetSelection && (
                <TargetSelectionOverlay
                    players={game.players.filter(p => p.isAlive && p.userId !== user.id && !p.ghostState?.active)}
                    onSelectTarget={handleSelectTarget}
                    actionText={`Attack for ${game.rollResult?.die || 0} damage! Select a target.`}
                />
            )}
        </div>
    );
}