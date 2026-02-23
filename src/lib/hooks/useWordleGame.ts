import { useEffect, useState } from "react";
import { usePlayer } from "../PlayerContext";
import {
  loadTodaysGame,
  saveGuess,
  SaveGuessResult,
} from "../syncService";
import { loadGameStateFromLocalStorage } from "../localStorage";
import { PlayContext } from "../playContext";
import { logMyEvent } from "../settingsFirebase";
import { PlayState, getGameStateFromGuesses } from "../statuses";
import { isWinningWord, isWordInWordList } from "../words";

type GameData = {
  guesses: string[];
  isGameWon: boolean;
  isGameLoose: boolean;
  startTime?: number;
  endTime?: number;
};

export const useWordleGame = (playContext: PlayContext) => {
  const { token } = usePlayer();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<PlayState>("notStarted");
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [errorWordNotInDictionary, setErrorWordNotInDictionary] =
    useState(false);
  const [saveError, setSaveError] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [gameEndTime, setGameEndTime] = useState<Date | null>(null);
  const [loadedFromServer, setLoadedFromServer] = useState(false);

  const applyGameData = (data: GameData | null) => {
    if (!data) {
      setGameStartTime(null);
      setGameEndTime(null);
      setCurrentGuess("");
      setGuesses([]);
      setGameStatus("notStarted");
      return;
    }
    setGuesses(data.guesses);
    setGameStartTime(data.startTime ? new Date(data.startTime) : null);
    setGameEndTime(data.endTime ? new Date(data.endTime) : null);
    const status = getGameStateFromGuesses(playContext, data.guesses);
    if (status === "win") setGameStatus("win");
    else if (status === "loose") setGameStatus("loose");
    else if (data.guesses.length > 0) setGameStatus("playing");
    else setGameStatus("notStarted");
  };

  // Load game on mount
  useEffect(() => {
    logMyEvent("start", navigator.userAgent || navigator.vendor);

    const localData = loadGameStateFromLocalStorage(playContext);
    if (localData) {
      applyGameData({
        guesses: localData.guesses,
        isGameWon:
          localData.guesses.length > 0 &&
          getGameStateFromGuesses(playContext, localData.guesses) === "win",
        isGameLoose:
          localData.guesses.length > 0 &&
          getGameStateFromGuesses(playContext, localData.guesses) === "loose",
        startTime: localData.startTime,
        endTime: localData.endTime,
      });
    }

    if (token) {
      loadTodaysGame(token, playContext).then((data) => {
        if (data) {
          applyGameData(data);
          setLoadedFromServer(true);
        } else if (!localData) {
          applyGameData(null);
        }
      });
    } else if (!localData) {
      applyGameData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playContext, token]);

  // Show modal on game end
  useEffect(() => {
    if (gameStatus === "win" || gameStatus === "loose") {
      setIsWinModalOpen(true);
    }
  }, [gameStatus]);

  const onChar = (value: string) => {
    if (
      currentGuess.length < 5 &&
      guesses.length < 6 &&
      gameStatus !== "win"
    ) {
      setCurrentGuess(`${currentGuess}${value}`);
    }
  };

  const onDelete = () => {
    setCurrentGuess(currentGuess.slice(0, -1));
  };

  const onEnter = () => {
    const lastGuess = currentGuess;

    if (!isWordInWordList(playContext.solution, currentGuess)) {
      return setErrorWordNotInDictionary(true);
    }

    const actualGuessAttempt = guesses.length;

    if (
      currentGuess.length === 5 &&
      actualGuessAttempt < 6 &&
      gameStatus !== "win"
    ) {
      const newGuesses = [...guesses, currentGuess];
      const winningWord = isWinningWord(playContext.solution, currentGuess);
      const newGameState = getGameStateFromGuesses(playContext, newGuesses);

      logMyEvent("guess", lastGuess);

      if (actualGuessAttempt === 0) {
        setGameStartTime(new Date());
      }
      const newEndTime = new Date();
      setGameEndTime(newEndTime);

      const startMs =
        actualGuessAttempt === 0
          ? newEndTime.getTime()
          : gameStartTime
          ? gameStartTime.getTime()
          : undefined;

      if (token) {
        saveGuess(
          token,
          playContext,
          newGuesses,
          winningWord,
          newGameState === "loose",
          startMs,
          newGameState === "win" || newGameState === "loose"
            ? newEndTime.getTime()
            : undefined
        ).then((result: SaveGuessResult) => {
          if (!result.success) {
            setSaveError(true);
          }
        });
      }

      setGuesses(newGuesses);
      setCurrentGuess("");

      if (newGameState === "win") {
        logMyEvent("win", lastGuess);
        return setGameStatus("win");
      }

      if (newGameState === "loose") {
        logMyEvent("loose", lastGuess);
        return setGameStatus("loose");
      }
    }
  };

  return {
    guesses,
    currentGuess,
    gameStatus,
    isWinModalOpen,
    setIsWinModalOpen,
    errorWordNotInDictionary,
    setErrorWordNotInDictionary,
    saveError,
    setSaveError,
    gameStartTime,
    gameEndTime,
    loadedFromServer,
    onChar,
    onDelete,
    onEnter,
  };
};
