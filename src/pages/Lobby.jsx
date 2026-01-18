import React, { useState, useEffect } from 'react';
import { Game } from '@/entities/Game';
import { User } from '@/entities/User';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Users, Settings } from 'lucide-react';
import CreateGameForm from '@/components/lobby/CreateGameForm';
import GameList from '@/components/lobby/GameList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function LobbyPage() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        // Fetch waiting games AND games user is part of
        const waitingGames = await Game.filter({ status: 'waiting' }, '-created_date', 50);
        const allGames = await Game.filter({}, '-created_date', 100);
        
        // Include in-progress games where user is a player
        const userInProgressGames = allGames.filter(g => 
          g.status === 'in_progress' && 
          g.players.some(p => p.userId === currentUser.id)
        );
        
        setGames([...userInProgressGames, ...waitingGames]);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Not logged in, redirect
        if (error.message.includes('not authenticated')) {
            User.login();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
    const interval = setInterval(fetchInitialData, 5000); // Refresh games every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleCreateGame = async (enabledExpansions) => {
    if (!user) return;
    setIsCreating(true);
    try {
      const newGame = await Game.create({
        hostId: user.id,
        status: 'waiting',
        players: [{
          userId: user.id,
          email: user.email,
          fullName: user.inGameName || user.full_name,
          health: 20,
          hand: [],
          faceUpDiscards: [],
          isAlive: true,
          isReady: false
        }],
        enabledExpansions,
      });
      navigate(createPageUrl(`GameRoom?id=${newGame.id}`));
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setIsCreating(false);
      setOpenCreateDialog(false);
    }
  };

  const handleJoinGame = async (gameId) => {
    if (!user || isJoining) return;
    setIsJoining(true);

    try {
        const game = await Game.get(gameId);
        if (game.players.length >= 10) {
            alert("This game is full!");
            return;
        }
        if (game.players.some(p => p.userId === user.id)) {
            // Already in game, just navigate
            navigate(createPageUrl(`GameRoom?id=${gameId}`));
            return;
        }

        const newPlayer = {
            userId: user.id,
            email: user.email,
            fullName: user.inGameName || user.full_name,
            health: 20,
            hand: [],
            faceUpDiscards: [],
            isAlive: true,
            isReady: false
        };

        await Game.update(gameId, {
            players: [...game.players, newPlayer]
        });
        
        navigate(createPageUrl(`GameRoom?id=${gameId}`));
    } catch(error) {
        console.error("Failed to join game:", error);
        if (error.message.includes('not found') || error.message.includes('500')) {
            alert("This game no longer exists. It may have been deleted.");
        } else {
            alert("Could not join the game. It might no longer be available.");
        }
    } finally {
        setIsJoining(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-10 w-48 mb-12" />
        <div className="w-full max-w-4xl space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8 md:mb-12">
        <div className="text-left">
          <h2 className="text-2xl md:text-3xl text-gray-300">Welcome, {user?.inGameName || user?.full_name}</h2>
          <p className="text-yellow-200/70 mt-1">Find a table or host your own game.</p>
        </div>
        <Link to={createPageUrl('Settings')}>
            <Button variant="ghost">
                <Settings className="mr-2 h-4 w-4" />
                Settings
            </Button>
        </Link>
      </div>

      <div className="flex justify-center mb-8">
         <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-yellow-600 hover:bg-yellow-700 text-gray-900 text-lg font-bold shadow-lg shadow-yellow-600/20 transform hover:scale-105 transition-transform duration-200">
              <PlusCircle className="mr-2 h-6 w-6" /> Create New Game
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-yellow-700/50 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl text-yellow-400">Host a New Game</DialogTitle>
            </DialogHeader>
            <CreateGameForm onSubmit={handleCreateGame} isCreating={isCreating} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-4xl mx-auto">
        <h3 className="flex items-center text-xl font-bold mb-4 text-yellow-500/90">
            <Users className="mr-2 h-5 w-5"/> Open Lobbies
        </h3>
        <GameList games={games} onJoin={handleJoinGame} isJoining={isJoining} currentUserId={user?.id} />
      </div>
    </div>
  );
}