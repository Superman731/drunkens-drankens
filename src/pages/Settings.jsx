import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SettingsPage() {
    const [user, setUser] = useState(null);
    const [inGameName, setInGameName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                setInGameName(currentUser.inGameName || currentUser.full_name || '');
            } catch (error) {
                console.error("Failed to fetch user", error);
                navigate(createPageUrl('Lobby'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!inGameName.trim()) {
            alert("Name cannot be empty.");
            return;
        }
        setIsSaving(true);
        try {
            await User.updateMyUserData({ inGameName });
            alert("Name updated successfully!");
        } catch (error) {
            console.error("Failed to save name", error);
            alert("There was an error saving your name.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-400" /></div>;
    }

    return (
        <div className="max-w-md mx-auto bg-gray-800/50 border border-yellow-800/40 rounded-lg p-8">
            <Button variant="ghost" onClick={() => navigate(createPageUrl('Lobby'))} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lobby
            </Button>
            <h2 className="text-3xl font-bold text-yellow-400 mb-6">Settings</h2>
            <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="inGameName" className="text-lg text-gray-300">In-Game Name</Label>
                    <Input
                        id="inGameName"
                        type="text"
                        value={inGameName}
                        onChange={(e) => setInGameName(e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white"
                        maxLength="20"
                    />
                    <p className="text-sm text-gray-500">This name will be displayed to other players.</p>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-bold">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
            </form>
        </div>
    );
}