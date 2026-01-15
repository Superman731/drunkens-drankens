import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dices, Loader2 } from 'lucide-react';

export default function DiceRoller({ rollResult, isRolling, canRoll, onRoll, isActionInProgress }) {
    
    const getOutcomeColor = (outcome) => {
        switch(outcome) {
            case 'Attack': return 'text-red-400';
            case 'Self-Hit': return 'text-yellow-400';
            case 'Pass': return 'text-green-400';
            default: return 'text-gray-400';
        }
    };

    const showResult = !isRolling && rollResult;

    return (
        <div className="text-center">
            <div className="flex justify-center space-x-6 mb-6">
                <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">Coins</p>
                    <div className="flex space-x-2">
                        {[0, 1].map(index => (
                            <motion.div
                                key={index}
                                className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-yellow-400"
                                animate={isRolling ? { rotateY: [0, 360, 720, 1080], scale: [1, 1.2, 1, 1.2, 1] } : {}}
                                transition={isRolling ? { duration: 1.5, ease: "easeInOut" } : { duration: 0 }}
                            >
                                {showResult ? (rollResult.coins[index] === 'Heads' ? '👑' : '💀') : ' ? '}
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">D8 Die</p>
                    <motion.div
                        className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center text-2xl font-bold border-4 border-red-400"
                        animate={isRolling ? { rotate: [0, 360, 720, 1080], scale: [1, 1.3, 1, 1.3, 1] } : {}}
                        transition={isRolling ? { duration: 1.5, ease: "easeInOut" } : { duration: 0 }}
                    >
                        {showResult ? rollResult.die : '?'}
                    </motion.div>
                </div>
            </div>

            {showResult && (
                <div className="mb-4">
                    <p className="text-lg mb-2">
                        <span className="text-gray-300">Result: </span>
                        <span className={`font-bold text-xl ${getOutcomeColor(rollResult.outcome)}`}>
                            {rollResult.outcome}
                        </span>
                        {rollResult.outcome !== 'Pass' && ` for ${rollResult.die} damage`}
                    </p>
                </div>
            )}

            {canRoll && (
                <Button 
                    onClick={onRoll}
                    disabled={isRolling || isActionInProgress}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-4"
                >
                    {isRolling ? (
                         <>
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mr-2"
                            >
                                <Dices className="h-6 w-6" />
                            </motion.div>
                            Rolling...
                        </>
                    ) : isActionInProgress ? (
                        <>
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Dices className="mr-2 h-6 w-6" />
                            Roll Dice
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}