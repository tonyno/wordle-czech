import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { saveGames } from "../lib/authorization";
import {
  saveAllResultsToFirebase,
  saveGameResultFirebase,
} from "../lib/dataAdapter";
import {
  loadGameStateFromLocalStorage,
  migration1,
  saveGameStateToLocalStorage,
  updateFinishedGameStats,
} from "../lib/localStorage";
import { PlayContext } from "../lib/playContext";
import { auth, logMyEvent } from "../lib/settingsFirebase";
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

const WordlePlay = ({ playContext }: Props) => {
  const dataFromLocalStorage = loadGameStateFromLocalStorage(playContext);
  const [guesses, setGuesses] = useState<string[]>(
    dataFromLocalStorage?.guesses || []
  );
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<PlayState>("notStarted");
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [errorWordNotInDictionary, setErrorWordNotInDictionary] =
    useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [gameEndTime, setGameEndTime] = useState<Date | null>(null);
  const [user] = useAuthState(auth);
  console.log("USER ", user?.uid, user?.email, user?.photoURL);

  try {
    migration1();
  } catch (err) {
    console.error("migration1 error ", err);
  }

  // Only as part of the start of the app
  useEffect(() => {
    logMyEvent("start", navigator.userAgent || navigator.vendor);
    //console.log("Loaded from localStorage: ", dataFromLocalStorage);
    //console.log("guesses ", guesses);
    if (!dataFromLocalStorage) {
      setGameStartTime(null); // if word changed, then clean the time
      setGameEndTime(null); // if word changed, then clean the time
      setCurrentGuess("");
      setGuesses([]);
      setGameStatus("notStarted");
    } else {
      const initialStatus = getGameStateFromGuesses(playContext, guesses);
      setGameStartTime(
        dataFromLocalStorage?.startTime
          ? new Date(dataFromLocalStorage?.startTime)
          : null
      );
      setGameEndTime(
        dataFromLocalStorage?.endTime
          ? new Date(dataFromLocalStorage?.endTime)
          : null
      );
      //console.log("useEffect() start: ", initialStatus);
      if (initialStatus === "win" && gameStatus !== "win") {
        setGameStatus("win");
      }
      if (initialStatus === "loose" && gameStatus !== "loose") {
        setGameStatus("loose");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playContext]);
  // TODO https://github.com/facebook/create-react-app/issues/6880#issuecomment-485912528

  // useEffect(() => {
  //   saveGameStateToLocalStorage(guesses, playContext.solution, isGameWon);
  // }, [guesses, playContext, isGameWon]);

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
        // entering first word, remember the time when started
        setGameStartTime(new Date());
      }
      const newEndTime = new Date();
      setGameEndTime(newEndTime);
      // setGameDurationMs(
      //   gameStartTime ? Date.now() - gameStartTime?.getTime() : 0
      // );

      saveGameStateToLocalStorage(
        newGuesses,
        playContext,
        winningWord,
        newGameState === "loose",
        gameStartTime ? gameStartTime.getTime() : undefined,
        newGameState === "win" || newGameState === "loose"
          ? newEndTime.getTime()
          : undefined
      );
      setGuesses(newGuesses);
      setCurrentGuess("");

      if (newGameState === "win") {
        logMyEvent("win", lastGuess);
        saveGameResultFirebase(
          playContext,
          "TBD",
          "win",
          guesses,
          actualGuessAttempt,
          gameStartTime && newEndTime
            ? newEndTime.getTime() - gameStartTime.getTime()
            : undefined
        );
        updateFinishedGameStats(true, actualGuessAttempt);
        saveAllResultsToFirebase();
        saveGames(user);
        return setGameStatus("win");
      }

      if (newGameState === "loose") {
        logMyEvent("loose", lastGuess);
        saveGameResultFirebase(
          playContext,
          "TBD",
          "loose",
          guesses,
          actualGuessAttempt,
          gameStartTime && newEndTime
            ? newEndTime.getTime() - gameStartTime.getTime()
            : undefined
        );
        updateFinishedGameStats(false, actualGuessAttempt);
        saveAllResultsToFirebase();
        saveGames(user);
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
      {/* <AdsenseComponent
        adClient="ca-pub-9858251945255976"
        adSlot="4677459022"
      /> */}
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
