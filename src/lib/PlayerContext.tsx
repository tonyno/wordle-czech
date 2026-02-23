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
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializePlayer()
      .then((t) => {
        setTokenState(t);
      })
      .catch((err) => {
        console.error("Error initializing player:", err);
        // If we have a local token, use it anyway
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
