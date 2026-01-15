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
                return game.rollResult?.outcome === 'Attack' && !game.redirectedByElf;
            }

            if (card.id === 'paladin_heal_roll' && userPlayer.health >= 20) {
                return false;
            }
            
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
                        playableCards.map(card => (
                            <Button 
                                key={card.id}
                                disabled={isActionInProgress}
                                className="w-full bg-purple-600 hover:bg-purple-700 justify-start p-3 h-auto flex-col items-start text-left"
                                onClick={() => handleSelectCard(card)}
                            >
                                <div className="font-bold text-base">Play {card.name}</div>
                                <div className="text-xs font-normal opacity-80 whitespace-normal break-words">{card.text}</div>
                            </Button>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center italic">No playable cards in hand.</p>
                    )}
                    
                    <Button 
                        onClick={handleDrinkAndPass}
                        disabled={isActionInProgress}
                        className="w-full bg-red-800 hover:bg-red-700 text-white font-bold"
                    >
                        Drink {damage} & Pass
                    </Button>
                </div>
            </div>
        </div>
    );
}