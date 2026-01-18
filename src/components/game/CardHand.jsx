import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import Card from './Card';
import TargetSelectionOverlay from './TargetSelectionOverlay';

export default function CardHand({ game, user, onPlayCard, isActionInProgress }) {
    const { players, turnPhase, currentPlayerIndex } = game;
    const userPlayer = players.find(p => p.userId === user.id);
    const currentPlayer = players[currentPlayerIndex];
    const isCurrentPlayer = currentPlayer.userId === user.id;

    const [cardToPlay, setCardToPlay] = useState(null);

    if (!userPlayer?.hand || userPlayer.hand.length === 0) {
        return null;
    }
    
    const handleSelectCard = (card) => {
        // Cards played during attack phase
        const needsTarget = [
            'demon_hh_heal_xfer',
            'dragon_hh_aoe_shot',
            'giant_hh_aoe_full',
            'golum_hh_guardian',
            'cleric_hh_heal_mode',
            'unholy_ht_attack_opt'
        ];
        
        if (card.timing === 'onAttackEnemy' || (card.timing === 'onPass' && game.rollResult?.outcome === 'Pass')) {
            if (card.id === 'unholy_ht_attack_opt' || card.id === 'demon_hh_heal_xfer') {
                setCardToPlay(card); // Needs target
            } else if (card.id === 'dragon_hh_aoe_shot' || card.id === 'giant_hh_aoe_full' || 
                       card.id === 'golum_hh_guardian' || card.id === 'cleric_hh_heal_mode') {
                // AOE or self-buff cards don't need target selection
                onPlayCard(card, null);
            }
        }
    };
    
    const handleSelectTargetAndPlay = (targetId) => {
        onPlayCard(cardToPlay, targetId);
        setCardToPlay(null);
    }
    
    const isCardPlayable = (card) => {
        if (!isCurrentPlayer || isActionInProgress) return false;
        
        if (card.timing === 'onAttackEnemy' && turnPhase === 'target_selection') return true;
        if (card.timing === 'onPass' && game.rollResult?.outcome === 'Pass' && turnPhase === 'target_selection') return true;
        
        return false;
    };
    
     if (cardToPlay) {
        const eligibleTargets = players.filter(p => 
            p.isAlive && 
            p.userId !== user.id && 
            !p.isDisconnected && 
            !p.ghostState?.active
        );
        
        return (
             <TargetSelectionOverlay
                players={eligibleTargets}
                onSelectTarget={handleSelectTargetAndPlay}
                actionText={`Play ${cardToPlay.name}: Select a target.`}
                onCancel={() => setCardToPlay(null)}
                currentPlayer={userPlayer}
                game={game}
            />
        )
    }

    return (
        <div className="bg-gray-800/50 border border-yellow-800/40 rounded-lg p-4">
            <h3 className="font-bold text-yellow-400 mb-4 flex items-center">
                <Zap className="mr-2 h-4 w-4" />
                Your Hand
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPlayer.hand.map((card, index) => (
                    <Card 
                        key={card.uniqueId || `${card.id}_${index}`}
                        card={card}
                        onPlayCard={() => handleSelectCard(card)}
                        isPlayable={isCardPlayable(card)}
                    />
                ))}
            </div>
        </div>
    );
}