import GameRoom from './pages/GameRoom';
import Lobby from './pages/Lobby';
import Settings from './pages/Settings';
import StressTestReport from './pages/StressTestReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "GameRoom": GameRoom,
    "Lobby": Lobby,
    "Settings": Settings,
    "StressTestReport": StressTestReport,
}

export const pagesConfig = {
    mainPage: "Lobby",
    Pages: PAGES,
    Layout: __Layout,
};