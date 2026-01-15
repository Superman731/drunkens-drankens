
import React, { useState, useEffect, useRef } from 'react';
import { Game } from '@/entities/Game';
import { User } from '@/entities/User';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Crown } from 'lucide-react';
import { cards } from '@/components/game/cards';
import GameLobby from '@/components/game/GameLobby';
import GameBoard from '@/components/game/GameBoard';
import { applyGameAction } from '@/components/game/gameEngine';

export default function GameRoomPage() {
    const [game, setGame] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isActionInProgress, setIsActionInProgress] = useState(false); // New state to prevent multiple actions
    const navigate = useNavigate();
    const lastActiveTime = useRef(Date.now()); // For tracking local user activity
    
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');

    useEffect(() => {
        if (!gameId) {
            navigate(createPageUrl('Lobby'));
            return;
        }

        // Add visibility change and mousemove listeners to track player presence
        const handleActivity = () => {
            lastActiveTime.current = Date.now();
        };
        document.addEventListener("visibilitychange", handleActivity);
        document.addEventListener("mousemove", handleActivity);
        document.addEventListener("keydown", handleActivity);


        const fetchGameData = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                
                const gameData = await Game.get(gameId);
                setGame(gameData);
                
                const isPlayerInGame = gameData.players.some(p => p.userId === currentUser.id);
                if (!isPlayerInGame) {
                    setError("You are not part of this game.");
                }
            } catch (err) {
                console.error("Error fetching game:", err);
                // If game not found, redirect to lobby
                if (err.message.includes('not found') || err.message.includes('500')) {
                    alert("The game could not be found. Returning to Lobby."); // Added alert
                    navigate(createPageUrl('Lobby'));
                    return;
                }
                setError("Game not found or you don't have access.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchGameData();
        
        // Poll for updates every 2 seconds
        const interval = setInterval(async () => {
            if (document.hidden) return; // Don't poll if tab is not active
            try {
                let updatedGame = await Game.get(gameId);

                // --- Disconnection Logic ---
                const now = Date.now();
                // Check if the game state itself was updated recently (e.g., within the last 20 seconds)
                // This helps differentiate between genuine disconnections and just a paused game state
                const gameUpdatedRecently = new Date(updatedGame.lastActionTimestamp).getTime() > now - 20000;
                let needsUpdate = false;

                const updatedPlayers = updatedGame.players.map(p => {
                    // Mark other players as disconnected if their lastSeen is old AND the game wasn't recently active
                    const isDisconnected = p.userId !== user?.id && p.lastSeen && (now - p.lastSeen > 15000) && !gameUpdatedRecently;
                    
                    if (p.isDisconnected !== isDisconnected) {
                        needsUpdate = true;
                    }
                    
                    // Always update current user's lastSeen and mark as connected
                    if (p.userId === user?.id) {
                        // Only update if there's actual activity detected, otherwise rely on the interval.
                        // This prevents constantly writing to DB if user is just idle.
                        // For simplicity and adherence to outline, we'll update lastSeen if component is active.
                        // The `lastActiveTime.current` from event listeners provides the most accurate local activity.
                        // However, the outline wants `now` here, implying update on every poll if active.
                        // Let's use `lastActiveTime.current` for more precision.
                        const newLastSeen = lastActiveTime.current;
                        if (!p.lastSeen || p.lastSeen < newLastSeen || p.isDisconnected) { // Update if no lastSeen, or more recent activity, or was disconnected
                            needsUpdate = true;
                            return { ...p, lastSeen: newLastSeen, isDisconnected: false };
                        }
                    }
                    return { ...p, isDisconnected };
                });

                // If any player's status changed, or the current user's lastSeen needs initial setting/update
                // Check if the actual player object for the current user in the `updatedGame` needs a `lastSeen` update.
                const currentUserInGame = updatedPlayers.find(p => p.userId === user?.id);
                if (currentUserInGame && (!currentUserInGame.lastSeen || currentUserInGame.lastSeen < lastActiveTime.current || currentUserInGame.isDisconnected)) {
                    needsUpdate = true;
                    // Re-map to ensure this specific player's lastSeen is updated if needed by the logic above
                    updatedGame.players = updatedGame.players.map(p => 
                        p.userId === user?.id ? { ...p, lastSeen: lastActiveTime.current, isDisconnected: false } : p
                    );
                } else {
                     updatedGame.players = updatedPlayers; // Apply other players' updated status
                }


                if (needsUpdate) {
                    await Game.update(gameId, { players: updatedGame.players });
                }
                
                setGame(updatedGame);
            } catch (err) {
                // If game not found during polling, redirect to lobby
                if (err.message.includes('not found') || err.message.includes('500')) {
                    console.warn(`Game ${gameId} not found during polling, redirecting to lobby.`);
                    if(window.location.href.includes('GameRoom')) {
                        clearInterval(interval);
                        alert("The game has ended. Returning to Lobby."); // Added alert
                        navigate(createPageUrl('Lobby'));
                    }
                }
            }
        }, 2000);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleActivity);
            document.removeEventListener("mousemove", handleActivity);
            document.removeEventListener("keydown", handleActivity);
        };
    }, [gameId, navigate, user?.id]);

    const handleStartGame = async () => {
        if (!game || !user || game.hostId !== user.id) return;
        
        try {
            // Build decks with proper distribution
            const enabledSets = ['OG', ...game.enabledExpansions];
            const availableCards = cards.filter(c => enabledSets.includes(c.expansion));
            
            // Separate cards by type - Black cards get 1 copy each, Regular cards get 10 copies each
            const redCards = [];
            const blueCards = [];
            
            availableCards.forEach(card => {
                const copies = card.type === 'Black' ? 1 : 10;
                for (let i = 0; i < copies; i++) {
                    const cardCopy = { ...card, uniqueId: `${card.id}_${i}` };
                    if (card.deck === 'red') redCards.push(cardCopy);
                    else blueCards.push(cardCopy);
                }
            });
            
            // Shuffle decks
            const shuffleArray = (array) => {
                const shuffled = [...array];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            };
            
            const shuffledRed = shuffleArray(redCards);
            const shuffledBlue = shuffleArray(blueCards);
            
            // Deal cards to players (1 red, 1 blue each)
            const updatedPlayers = game.players.map((player, index) => ({
                ...player,
                isDisconnected: false, // Reset disconnection status on start
                lastSeen: Date.now(), // Set initial lastSeen time
                hand: [
                    shuffledRed[index] || null,
                    shuffledBlue[index] || null
                ].filter(Boolean),
                ghostState: { active: false, turnsRemaining: 0 }
            }));
            
            // Remove dealt cards from decks
            const remainingRed = shuffledRed.slice(game.players.length);
            const remainingBlue = shuffledBlue.slice(game.players.length);
            
            // Choose random starting player
            const randomStartIndex = Math.floor(Math.random() * game.players.length);
            
            await Game.update(gameId, {
                status: 'in_progress',
                players: updatedPlayers,
                deckRed: remainingRed,
                deckBlue: remainingBlue,
                currentPlayerIndex: randomStartIndex,
                turnPhase: 'rolling',
                gameLog: [`Game started! ${updatedPlayers[randomStartIndex].fullName} goes first.`],
                lastActionTimestamp: new Date().toISOString()
            });
            
        } catch (err) {
            console.error("Error starting game:", err);
        }
    };
    
    const handleGameAction = async (action) => {
        if (isActionInProgress) return; // Prevent spamming actions
        setIsActionInProgress(true);
        try {
            const currentGameState = await Game.get(gameId); // Get latest state before applying action
            const finalGameState = await applyGameAction(currentGameState, action);
            await Game.update(gameId, finalGameState);
        } catch (error) {
            console.error("Error processing game action:", error);
            // Re-fetch to correct any bad state
            const freshGame = await Game.get(gameId);
            setGame(freshGame);
        } finally {
            setIsActionInProgress(false);
        }
    };

    const handleLeaveGame = async () => {
        if (!game || !user) return;
        
        try {
            if (game.hostId === user.id) {
                // If game is in progress and host leaves, abort it.
                if (game.status === 'in_progress') {
                    await Game.update(gameId, {
                        status: 'finished',
                        gameLog: [...game.gameLog, `${user.fullName} (Host) has left. The game is over.`],
                        winner: { userId: 'aborted', fullName: 'Game Aborted' }
                    });
                } else {
                    // Host is leaving a waiting lobby, delete the game
                    await Game.delete(gameId);
                }
            } else {
                // A non-host player is leaving.
                const leavingPlayer = game.players.find(p => p.userId === user.id);
                const updatedPlayers = game.players.filter(p => p.userId !== user.id);
                const updates = { 
                    players: updatedPlayers, 
                    gameLog: [...game.gameLog, `${leavingPlayer?.fullName || 'A player'} has left the game.`] 
                };
                
                // If the leaving player was the current player during an active game, advance the turn.
                if (game.status === 'in_progress' && game.players[game.currentPlayerIndex]?.userId === user.id) {
                    const originalPlayerCount = game.players.length;
                    let nextIndex = game.currentPlayerIndex % updatedPlayers.length;

                    // Find the next alive player from the new list
                    // Note: 'isAlive' property is not defined on player objects in current context,
                    // so this loop will iterate through all elements if 'isAlive' is always undefined.
                    let i = 0;
                    while (updatedPlayers.length > 0 && !updatedPlayers[nextIndex]?.isAlive && i < updatedPlayers.length) {
                        nextIndex = (nextIndex + 1) % updatedPlayers.length;
                        i++;
                    }

                    // If all players leave, the game should effectively end
                    if (updatedPlayers.length === 0) {
                        updates.status = 'finished';
                        updates.gameLog.push('All players have left. Game ended.');
                        updates.winner = { userId: 'aborted', fullName: 'Game Aborted - No Players' };
                    } else {
                        updates.currentPlayerIndex = nextIndex;
                        updates.turnPhase = 'rolling'; // Reset turn for the new player
                        updates.gameLog.push(`Turn passed to ${updatedPlayers[nextIndex]?.fullName}.`);
                    }
                }

                await Game.update(gameId, updates);
            }
            navigate(createPageUrl('Lobby'));
        } catch (err) {
            console.error("Error leaving game:", err);
            alert("There was an error leaving the game. You will be returned to the lobby.");
            navigate(createPageUrl('Lobby'));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-300">Loading game...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center">
                <h2 className="text-2xl text-red-400 mb-4">Error</h2>
                <p className="text-gray-300 mb-6">{error}</p>
                <Button onClick={() => navigate(createPageUrl('Lobby'))} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Lobby
                </Button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Button 
                    variant="outline" 
                    onClick={handleLeaveGame}
                    className="border-gray-600 hover:bg-gray-700"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Leave Game
                </Button>
                
                <div className="flex items-center space-x-4 text-gray-300">
                    <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{game?.players?.length || 0} players</span>
                    </div>
                    {game?.hostId === user?.id && game.status === 'waiting' && (
                        <div className="flex items-center text-yellow-400">
                            <Crown className="mr-1 h-4 w-4" />
                            <span className="font-semibold">Host</span>
                        </div>
                    )}
                </div>
            </div>

            {game?.status === 'waiting' ? (
                <GameLobby 
                    game={game}
                    user={user}
                    onStartGame={handleStartGame}
                />
            ) : game ? (
                <GameBoard 
                    game={game}
                    user={user}
                    onGameAction={handleGameAction}
                    isActionInProgress={isActionInProgress}
                />
            ) : null}
        </div>
    );
}
