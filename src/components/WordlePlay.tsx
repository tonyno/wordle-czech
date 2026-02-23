import { Box, Typography } from "@mui/material";
import { PlayContext } from "../lib/playContext";
import { useWordleGame } from "../lib/hooks/useWordleGame";
import styles from "./WordlePlay.module.css";
import MyAlert from "./alerts/MyAlert";
import { Grid } from "./grid/Grid";
import { Keyboard } from "./keyboard/Keyboard";
import EndGameModal from "./modals/EndGameModal";

type Props = {
  playContext: PlayContext;
};

const WordlePlay = ({ playContext }: Props) => {
  const {
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
    onChar,
    onDelete,
    onEnter,
  } = useWordleGame(playContext);

  return (
    <Box className={styles.WordlePlay}>
      <MyAlert
        open={errorWordNotInDictionary}
        onClose={() => setErrorWordNotInDictionary(false)}
        message="Slovo nenalezeno ve slovníku!"
        variant="error"
        autoHide={2000}
      />
      <MyAlert
        open={saveError}
        onClose={() => setSaveError(false)}
        message="Nepodařilo se uložit na server. Hra je uložena lokálně."
        variant="warning"
        autoHide={5000}
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
