import React, { createContext, useContext, useEffect, useState } from "react";
import { initializePlayer, getToken } from "./syncService";
import { logLocalStorageReport, logError } from "./logService";

type PlayerContextType = {
  token: string | null;
  loading: boolean;
  migrating: boolean;
  refreshToken: () => void;
};

const PlayerContext = createContext<PlayerContextType>({
  token: null,
  loading: true,
  migrating: false,
  refreshToken: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const localToken = getToken();
  const [token, setTokenState] = useState<string | null>(localToken);
  // If we already have a local token, no need to block rendering
  const [loading, setLoading] = useState(!localToken);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    // Skip automatic player initialization on /migrate_to — that page
    // first restores localStorage from another environment before we
    // should generate a token or migrate data to Firestore.
    if (window.location.pathname === "/migrate_to") {
      setLoading(false);
      return;
    }

    logLocalStorageReport();

    initializePlayer(setMigrating)
      .then((t) => {
        setTokenState(t);
      })
      .catch((err) => {
        logError("Error initializing player", { error: String(err) });
        const local = getToken();
        if (local) setTokenState(local);
      })
      .finally(() => {
        setLoading(false);
        setMigrating(false);
      });
  }, []);

  const refreshToken = () => {
    setTokenState(getToken());
  };

  return (
    <PlayerContext.Provider value={{ token, loading, migrating, refreshToken }}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerContext;
