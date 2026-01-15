import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ card, onPlayCard, isPlayable }) {
    if (!card) return null;

    const getBorderColor = () => {
        if (card.type === 'Black') return 'border-yellow-400 shadow-yellow-400/30';
        if (card.deck === 'red') return 'border-red-600';
        return 'border-blue-600';
    };

    const getBackgroundColor = () => {
        if (card.type === 'Black') return 'bg-gray-900';
        if (card.deck === 'red') return 'bg-red-900/20';
        return 'bg-blue-900/20';
    };

    return (
        <motion.div
            whileHover={isPlayable ? { scale: 1.05, y: -10 } : {}}
            className={`h-full border-4 rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${getBorderColor()} ${getBackgroundColor()} ${isPlayable ? 'cursor-pointer shadow-lg' : 'opacity-70 saturate-50'}`}
            onClick={() => isPlayable && onPlayCard(card)}
        >
            <div>
                <h4 className="font-bold text-lg text-white mb-2">{card.name}</h4>
                
                {/* Placeholder for Card Art */}
                <div className="h-24 bg-black/30 rounded-md mb-3 flex items-center justify-center">
                    <span className="text-gray-500 text-sm italic">Card Art Here</span>
                </div>

                <p className="text-sm text-gray-300 mb-2">{card.text}</p>
            </div>
            
            <div>
                {card.quote && (
                    <p className="text-xs text-yellow-200/70 italic border-t border-yellow-700/30 pt-2 mt-3">
                        "{card.quote}"
                    </p>
                )}
                <div className="text-xs text-gray-500 mt-2 uppercase tracking-wider">
                    {card.deck} • {card.expansion}
                </div>
            </div>
        </motion.div>
    );
}