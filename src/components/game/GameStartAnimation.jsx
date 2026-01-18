import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function GameStartAnimation({ playerCards, onComplete }) {
    const [stage, setStage] = useState('shuffle'); // shuffle -> deal -> reveal -> complete
    const [showCards, setShowCards] = useState(false);

    useEffect(() => {
        // Shuffle animation
        const shuffleTimer = setTimeout(() => {
            setStage('deal');
        }, 1500);

        // Deal cards face down
        const dealTimer = setTimeout(() => {
            setShowCards(true);
            setStage('reveal');
        }, 2500);

        // Reveal cards
        const revealTimer = setTimeout(() => {
            setStage('complete');
            onComplete();
        }, 4500);

        return () => {
            clearTimeout(shuffleTimer);
            clearTimeout(dealTimer);
            clearTimeout(revealTimer);
        };
    }, [onComplete]);

    if (stage === 'complete') return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
            <div className="text-center">
                {stage === 'shuffle' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <Sparkles className="w-16 h-16 text-yellow-400 mx-auto animate-spin" />
                        <h2 className="text-4xl font-bold text-yellow-400">Shuffling Deck...</h2>
                    </motion.div>
                )}

                {(stage === 'deal' || stage === 'reveal') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <h2 className="text-3xl font-bold text-yellow-400 mb-8">Your Cards</h2>
                        <div className="flex gap-8 justify-center">
                            <AnimatePresence>
                                {showCards && playerCards.map((card, index) => (
                                    <motion.div
                                        key={card.uniqueId || card.id}
                                        initial={{ 
                                            x: 0, 
                                            y: -500, 
                                            rotateY: 0,
                                            opacity: 0 
                                        }}
                                        animate={{ 
                                            x: 0, 
                                            y: 0, 
                                            rotateY: stage === 'reveal' ? 180 : 0,
                                            opacity: 1 
                                        }}
                                        transition={{ 
                                            delay: index * 0.3,
                                            duration: 0.8,
                                            type: "spring"
                                        }}
                                        className="relative"
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        <div className="relative w-48 h-72">
                                            {/* Card Back */}
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-br from-yellow-900 via-yellow-700 to-yellow-600 border-4 border-yellow-400 rounded-xl flex items-center justify-center shadow-2xl"
                                                style={{ 
                                                    backfaceVisibility: 'hidden',
                                                    transform: stage === 'reveal' ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                                }}
                                            >
                                                <div className="text-6xl">🃏</div>
                                            </motion.div>

                                            {/* Card Front */}
                                            <motion.div
                                                className={`absolute inset-0 border-4 rounded-xl p-4 flex flex-col justify-between shadow-2xl ${
                                                    card.type === 'Black' 
                                                        ? 'border-yellow-400 bg-gray-900' 
                                                        : card.deck === 'red' 
                                                            ? 'border-red-600 bg-red-900/20' 
                                                            : 'border-blue-600 bg-blue-900/20'
                                                }`}
                                                style={{ 
                                                    backfaceVisibility: 'hidden',
                                                    transform: stage === 'reveal' ? 'rotateY(0deg)' : 'rotateY(-180deg)'
                                                }}
                                            >
                                                <div>
                                                    <h4 className="font-bold text-xl text-white mb-3">{card.name}</h4>
                                                    <p className="text-xs text-gray-300">{card.text}</p>
                                                </div>
                                                <div className="text-xs text-gray-400 uppercase">
                                                    {card.deck} • {card.expansion}
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}