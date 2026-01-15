import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Lobby": Lobby,
    "GameRoom": GameRoom,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Lobby",
    Pages: PAGES,
    Layout: __Layout,
};