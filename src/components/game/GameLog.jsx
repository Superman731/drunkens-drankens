import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';

export default function GameLog({ log }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log]);

    return (
        <div className="bg-gray-800/50 border border-yellow-800/40 rounded-lg">
            <div className="p-3 border-b border-yellow-800/40">
                <h3 className="font-bold text-yellow-400 flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Game Log
                </h3>
            </div>
            
            <ScrollArea className="h-64 p-3" ref={scrollRef}>
                <AnimatePresence>
                    {log.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Game starting...</p>
                    ) : (
                        <div className="space-y-2">
                            {log.map((entry, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-gray-300 p-2 bg-gray-700/30 rounded border-l-2 border-yellow-600/50"
                                >
                                    {entry}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}