import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { usePlayer } from "../lib/PlayerContext";
import {
  loadTodaysGame,
  saveGuess,
} from "../lib/syncService";
import { PlayContext } from "../lib/playContext";
import { logMyEvent } from "../lib/settingsFirebase";
import { PlayState, getGameStateFromGuesses } from "../lib/statuses";
import { isWinningWord, isWordInWordList } from "../lib/words";
import styles from "./WordlePlay.module.css";
import MyAlert from "./alerts/MyAlert";
import { Grid } from "./grid/Grid";
import { Keyboard } from "./keyboard/Keyboard";
import EndGameModal from "./modals/EndGameModal";

type Props = {
  playContext: PlayContext;
};

type GameData = {
  guesses: string[];
  isGameWon: boolean;
  isGameLoose: boolean;
  startTime?: number;
  endTime?: number;
};

const WordlePlay = ({ playContext }: Props) => {
  const { token } = usePlayer();
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<PlayState>("notStarted");
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [errorWordNotInDictionary, setErrorWordNotInDictionary] =
    useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [gameEndTime, setGameEndTime] = useState<Date | null>(null);
  const [loadedFromServer, setLoadedFromServer] = useState(false);

  // Apply loaded game data to state
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

  useEffect(() => {
    logMyEvent("start", navigator.userAgent || navigator.vendor);

    if (token) {
      loadTodaysGame(token, playContext).then((data) => {
        if (data) {
          console.log("Loaded game from Firestore for day", playContext.solutionIndex);
          applyGameData(data);
          setLoadedFromServer(true);
        } else {
          console.log("No game found in Firestore for day", playContext.solutionIndex);
          applyGameData(null);
        }
      });
    } else {
      applyGameData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playContext, token]);

  useEffect(() => {
    if (gameStatus === "win" || gameStatus === "loose") {
      setIsWinModalOpen(true);
    }
  }, [gameStatus]);

  const onChar = (value: string) => {
    if (currentGuess.length < 5 && guesses.length < 6 && gameStatus !== "win") {
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

      const startMs = actualGuessAttempt === 0
        ? newEndTime.getTime()
        : gameStartTime
          ? gameStartTime.getTime()
          : undefined;

      // Save via syncService (localStorage + Firestore + legacy)
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
        );
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

  return (
    <Box className={styles.WordlePlay}>
      <MyAlert
        open={errorWordNotInDictionary}
        onClose={() => setErrorWordNotInDictionary(false)}
        message="Slovo nenalezeno ve slovníku!"
        variant="error"
        autoHide={2000}
      />
      <Grid
        playContext={playContext}
        guesses={guesses}
        currentGuess={currentGuess}
      />
      <Keyboard
        playContext={playContext}
        onChar={onChar}
        onDelete={onDelete}
        onEnter={onEnter}
        guesses={guesses}
      />
      {playContext?.alertMessage && (
        <Typography sx={{ textAlign: "center", color: "red" }}>
          {playContext?.alertMessage}
        </Typography>
      )}
      <Typography sx={{ textAlign: "center", mt: 5 }} variant="body2">
        {" "}
      </Typography>
      <EndGameModal
        playContext={playContext}
        isOpen={isWinModalOpen}
        gameStatus={gameStatus}
        handleClose={() => setIsWinModalOpen(false)}
        guesses={guesses}
        gameDurationMs={
          gameStartTime && gameEndTime
            ? gameEndTime.getTime() - gameStartTime.getTime()
            : undefined
        }
      />
    </Box>
  );
};

export default WordlePlay;
