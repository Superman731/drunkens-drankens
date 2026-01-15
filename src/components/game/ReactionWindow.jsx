import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Sword } from 'lucide-react';
import TargetSelectionOverlay from './TargetSelectionOverlay';

export default function ReactionWindow({ game, userPlayer, onGameAction, isActionInProgress }) {
    const damage = game.rollResult?.die || 0;
    const isDefending = game.attackerId && game.targetId === userPlayer.userId;
    const isSelfHit = game.rollResult?.outcome === 'Self-Hit' && game.reactingPlayerId === userPlayer.userId;
    const [cardToPlay, setCardToPlay] = useState(null);

    const handleDrinkAndPass = () => {
        if (isActionInProgress) return;
        onGameAction({ type: 'DRINK_AND_PASS', payload: { playerId: userPlayer.userId } });
    };

    const handleSelectCard = (card) => {
        // Block Elf if already redirected
        if (card.id === 'elf_redirect_hh' && game.redirectedByElf) {
            return; // Do nothing, button is disabled
        }
        
        // Special handling for Ghost exit choice
        if (card.id === 'ghost_tt_persist' && userPlayer.ghostState?.active) {
            // Show choice: stay ghost or return
            setCardToPlay(card);
            return;
        }
        
        // Cards that need target selection
        const needsTarget = [
            'warrior_steal_roll', 
            'elf_redirect_hh', 
            'necromancer_split_half_roll',
            'troll_split_half_evenup',
            'thief_tt_halfdmg_steal',
            'summoner_raise_dead',
            'witch_tt_curse',
            'enchantress_tt_shared'
        ];
        
        if (needsTarget.includes(card.id)) {
            setCardToPlay(card);
        } else {
            onGameAction({ type: 'PLAY_CARD', payload: { playerId: userPlayer.userId, cardId: card.id, targetId: null }});
        }
    };

    const handleSelectTarget = (targetId) => {
        onGameAction({ type: 'PLAY_CARD', payload: { playerId: userPlayer.userId, cardId: cardToPlay.id, targetId: targetId }});
        setCardToPlay(null);
    };

    const getPlayableCards = () => {
        const timing = isDefending ? 'onDefend' : (isSelfHit ? 'onAttackSelf' : null);
        if (!timing) return [];
        
        return userPlayer.hand.filter(card => {
            // Check basic timing first
            if (!(card.timing === timing || card.timing === 'anytime')) return false;
            
            // Special card availability rules
            if (card.id === 'elf_redirect_hh') {
                // Show card but it's not playable if already redirected
                return game.rollResult?.outcome === 'Attack';
            }

            // Paladin can still be shown even at full health to avoid info leak
            // The engine will handle the cap at 20 HP
            
            if (card.id === 'summoner_raise_dead') {
                return game.players.some(p => !p.isAlive);
            }
            
            if (card.id === 'warrior_steal_roll' || card.id === 'necromancer_split_half_roll' || 
                card.id === 'troll_split_half_evenup' || card.id === 'thief_tt_halfdmg_steal') {
                return game.players.some(p => p.isAlive && p.userId !== userPlayer.userId && !p.isDisconnected && !p.ghostState?.active);
            }
            
            return true;
        });
    };

    const playableCards = getPlayableCards();
    
    if (cardToPlay) {
        // Special UI for Ghost exit choice
        if (cardToPlay.id === 'ghost_tt_persist' && userPlayer.ghostState?.active) {
            return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-800 border-2 border-purple-800/50 rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-2xl font-bold text-purple-400 text-center mb-4">👻 Ghost Choice</h3>
                        <p className="text-gray-300 text-center mb-6">You rolled two tails. Stay in ghost form or return to mortal?</p>
                        <div className="space-y-3">
                            <Button 
                                onClick={() => {
                                    onGameAction({ type: 'PLAY_CARD', payload: { playerId: userPlayer.userId, cardId: 'ghost_stay', targetId: null }});
                                    setCardToPlay(null);
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                Stay Ghost (Take {damage} damage)
                            </Button>
                            <Button 
                                onClick={() => {
                                    onGameAction({ type: 'PLAY_CARD', payload: { playerId: userPlayer.userId, cardId: 'ghost_tt_persist', targetId: null }});
                                    setCardToPlay(null);
                                }}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                Return to Mortal (Avoid damage)
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        
        let eligibleTargets = [];
        
        if (cardToPlay.id === 'summoner_raise_dead') {
            // Summoner targets dead players
            eligibleTargets = game.players.filter(p => !p.isAlive);
        } else if (cardToPlay.id === 'elf_redirect_hh') {
            // Elf CANNOT redirect if already redirected (prevent chains)
            if (game.redirectedByElf) {
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-gray-800 border-2 border-red-800/50 rounded-lg p-6 max-w-md mx-4">
                            <p className="text-red-400 text-center mb-4">Elf cannot redirect an already-redirected attack!</p>
                            <Button onClick={() => setCardToPlay(null)} className="w-full">Cancel</Button>
                        </div>
                    </div>
                );
            }
            eligibleTargets = game.players.filter(p => 
                p.isAlive && 
                !p.isDisconnected && 
                p.userId !== userPlayer.userId && 
                p.userId !== game.attackerId && 
                !p.ghostState?.active
            );
        } else {
            // Most cards target alive, connected, non-ghost players
            eligibleTargets = game.players.filter(p => 
                p.isAlive && 
                !p.isDisconnected && 
                p.userId !== userPlayer.userId && 
                !p.ghostState?.active
            );
        }
        
        return (
            <TargetSelectionOverlay
                players={eligibleTargets}
                onSelectTarget={handleSelectTarget}
                actionText={`Play ${cardToPlay.name}: Select a target.`}
                onCancel={() => setCardToPlay(null)}
                currentPlayer={userPlayer}
                game={game}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 border-2 border-yellow-800/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl shadow-black">
                <div className="text-center mb-6">
                    {isDefending && (
                        <>
                            <Shield className="w-12 h-12 text-red-400 mx-auto mb-2" />
                            <h3 className="text-2xl font-bold text-red-400">You are Attacked!</h3>
                            <p className="text-gray-300 text-lg">Take {damage} damage or play a card.</p>
                        </>
                    )}
                    
                    {isSelfHit && (
                        <>
                            <Sword className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                            <h3 className="text-2xl font-bold text-yellow-400">Self-Hit!</h3>
                            <p className="text-gray-300 text-lg">Take {damage} damage or play a card.</p>
                        </>
                    )}
                </div>

                <div className="space-y-3">
                    {playableCards.length > 0 ? (
                        playableCards.map(card => {
                            const isElfBlocked = card.id === 'elf_redirect_hh' && game.redirectedByElf;
                            return (
                                <Button 
                                    key={card.id}
                                    disabled={isActionInProgress || isElfBlocked}
                                    className={`w-full justify-start p-3 h-auto flex-col items-start text-left ${
                                        isElfBlocked ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                                    }`}
                                    onClick={() => handleSelectCard(card)}
                                >
                                    <div className="font-bold text-base">Play {card.name}</div>
                                    <div className="text-xs font-normal opacity-80 whitespace-normal break-words">{card.text}</div>
                                </Button>
                            );
                        })
                    ) : null}
                    
                    <Button 
                        onClick={handleDrinkAndPass}
                        disabled={isActionInProgress}
                        className="w-full bg-red-800 hover:bg-red-700 text-white font-bold"
                    >
                        {playableCards.length > 0 ? `Drink ${damage} & Pass` : `Take ${damage} Damage`}
                    </Button>
                </div>
            </div>
        </div>
    );
}