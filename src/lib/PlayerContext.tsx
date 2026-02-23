import React, { createContext, useContext, useEffect, useState } from "react";
import { initializePlayer, getToken } from "./syncService";

type PlayerContextType = {
  token: string | null;
  loading: boolean;
  refreshToken: () => void;
};

const PlayerContext = createContext<PlayerContextType>({
  token: null,
  loading: true,
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

  useEffect(() => {
    initializePlayer()
      .then((t) => {
        setTokenState(t);
      })
      .catch((err) => {
        console.error("Error initializing player:", err);
        const local = getToken();
        if (local) setTokenState(local);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const refreshToken = () => {
    setTokenState(getToken());
  };

  return (
    <PlayerContext.Provider value={{ token, loading, refreshToken }}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerContext;
