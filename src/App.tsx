import {
  createTheme,
  CssBaseline,
  StyledEngineProvider,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DumpLocalStorage from "./components/debugTools/DumpLocalStorage";
import Faq from "./components/faq/Faq";
import IncomingFollowLink from "./components/follow/IncomingFollowLink";
import HistoryPlay from "./components/HistoryPlay";
import TopMenu from "./components/navigation/TopMenu";
import Settings from "./components/settings/Settings";
import AllUsersStatsDay from "./components/statistics/AllUsersStatsDay";
import History from "./components/statistics/History";
import PersonalStats from "./components/statistics/PersonalStats";
import TokenDisplay from "./components/TokenDisplay";
import Welcome from "./components/Welcome";
import WordlePlayWrapper from "./components/WordlePlayWrapper";
import { firstTimeVisit, getSettings, saveInitialPageConfirmed, SettingsItem } from "./lib/localStorage";
import { PlayerProvider } from "./lib/PlayerContext";
import { ApplicationContext } from "./lib/playContext";
import { getWordIndex } from "./lib/words";
import { getDesignTheme } from "./theme";
import Policy from "./components/policy/Policy";

function App() {
  const isDarkModeEnabledInSystem = useMediaQuery(
    "(prefers-color-scheme: dark)"
  );
  const [firstTime, setFirstTime] = useState(firstTimeVisit());
  const [currentSettings, setCurrentSettings] = useState<SettingsItem>(
    getSettings(false, isDarkModeEnabledInSystem)
  );

  const [appContext] = useState<ApplicationContext>({
    solutionIndex: getWordIndex(),
    typeOfGame: "wordle",
  });

  const [differentTopMessage, setDifferentTopMessage] = useState<
    string | undefined
  >(undefined);

  const setNewMessage = (newMessage: string) => {
    setDifferentTopMessage(newMessage);
  };

  const theme = useMemo(
    () => createTheme(getDesignTheme(currentSettings)),
    [currentSettings]
  );

  const themeChange = (settings: SettingsItem) => {
    setCurrentSettings(settings);
  };

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PlayerProvider>
          <BrowserRouter>
            <TopMenu
              appContext={appContext}
              differentTopMessage={differentTopMessage}
            />
            <Routes>
              <Route
                path="/"
                element={
                  firstTime ? (
                    <Welcome startGame={() => { saveInitialPageConfirmed(); setFirstTime(false); }} />
                  ) : (
                    <WordlePlayWrapper
                      appContext={appContext}
                      setNewMessage={setNewMessage}
                    />
                  )
                }
              />
              <Route
                path="/day/:solutionIndex"
                element={<HistoryPlay setNewMessage={setNewMessage} />}
              />
              <Route
                path="/stats/:solutionIndex"
                element={<AllUsersStatsDay setNewMessage={setNewMessage} />}
              />
              <Route path="/faq" element={<Faq />} />
              <Route path="/policy" element={<Policy />} />
              <Route path="/mystats" element={<PersonalStats />} />
              <Route path="/history" element={<History />} />
              <Route
                path="/follow/:followLink"
                element={<IncomingFollowLink />}
              />
              <Route
                path="/settings"
                element={<Settings onThemeChange={themeChange} />}
              />
              <Route path="/localstorage" element={<DumpLocalStorage />} />
            </Routes>
            <TokenDisplay />
          </BrowserRouter>
        </PlayerProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
