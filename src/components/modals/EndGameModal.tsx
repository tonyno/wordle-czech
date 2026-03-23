import CloseIcon from "@mui/icons-material/Close";
import ShareIcon from "@mui/icons-material/Share";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import {
  Alert,
  Box,
  Dialog,
  IconButton,
  Link,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useState } from "react";
import { PlayContext } from "../../lib/playContext";
import { canShare, shareStatus } from "../../lib/share";
import { PlayState } from "../../lib/statuses";
import { msToMinAndSeconds } from "../../lib/timeFunctions";
import { SURVEY_ENABLED, SURVEY_URL } from "../../constants/survey";
import { MiniGrid } from "../mini-grid/MiniGrid";

type Props = {
  playContext: PlayContext;
  isOpen: boolean;
  gameStatus: PlayState;
  handleClose: () => void;
  guesses: string[];
  gameDurationMs?: number;
};

const EndGameModal = ({
  playContext,
  isOpen,
  gameStatus,
  handleClose,
  guesses,
  gameDurationMs,
}: Props) => {
  const [shareNotification, setShareNotification] = useState(false);
  const [surveyDismissed, setSurveyDismissed] = useState(false);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="xs"
      fullWidth={true}
    >
      <DialogTitle>
        {gameStatus === "win" ? "Vyhrál/a jsi!" : "Dnes to nevyšlo!"}
        <IconButton
          aria-label="close"
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          {gameStatus === "win" ? (
            <ThumbUpIcon
              sx={{ color: "#059669", fontSize: "2rem" }}
              aria-hidden="true"
            />
          ) : (
            <ThumbDownIcon
              sx={{ color: "#DC2626", fontSize: "2rem" }}
              aria-hidden="true"
            />
          )}
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{ textAlign: "center" }}
          onClick={() => {
            handleClose();
          }}
        >
          {gameStatus === "loose" ? (
            <Typography variant="body2">
              Správné slovo:{" "}
              <b style={{ color: "#DC2626" }}>{playContext.solution}</b>
            </Typography>
          ) : (
            ""
          )}
          <Box sx={{ mt: "0.75rem" }}>
            <MiniGrid playContext={playContext} guesses={guesses} />
            {shareNotification ? (
              <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
                Vaše hra byla úspěšně vložena do schránky.
              </Alert>
            ) : (
              <Typography variant="body2" sx={{ mt: "0.75rem" }}>
                {gameStatus === "win"
                  ? "Skvělá práce. "
                  : "Nevadí, vyjde to zítra. "}
                {gameDurationMs ? msToMinAndSeconds(gameDurationMs) : ""}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ mt: "0.75rem", textAlign: "center" }}>
          <Button
            variant="contained"
            startIcon={<ShareIcon />}
            sx={{
              display: "inline-flex",
              justifyContent: "center",
              width: "100%",
            }}
            onClick={() => {
              shareStatus(
                playContext,
                guesses,
                gameStatus,
                false,
                gameDurationMs
              );
              if (canShare())
                shareStatus(
                  playContext,
                  guesses,
                  gameStatus,
                  true,
                  gameDurationMs
                );
              setShareNotification(true);
            }}
          >
            Sdílet
          </Button>

          <Typography
            sx={{
              fontSize: "0.75rem",
              lineHeight: "1rem",
              fontStyle: "italic",
              mt: "0.5rem",
              textAlign: "center",
            }}
          >
            {canShare() ? (
              <>
                Sdílet své výsledky můžete například do{" "}
                <Link href="https://www.facebook.com/groups/877607906265914">
                  této Facebookové skupiny.
                </Link>{" "}
                <br />
              </>
            ) : (
              ""
            )}
            Okno zavřete kliknutím mimo okno.
          </Typography>
        </Box>
        {SURVEY_ENABLED && (() => {
          const closed = surveyDismissed || !!localStorage.getItem("surveyClosed");
          return closed ? (
            <Box sx={{ mt: 1.5, textAlign: "center" }}>
              <Link
                href={SURVEY_URL}
                target="_blank"
                rel="noopener"
                sx={{
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Vyplnit dotazník na nový projekt (díky moc!)
              </Link>
            </Box>
          ) : (
            <Box
              sx={{
                mt: 2,
                textAlign: "center",
                position: "relative",
                background:
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 2,
                p: 2,
                animation:
                  "surveyPulse 1.5s ease-in-out infinite, surveyShimmer 3s linear infinite",
                "@keyframes surveyPulse": {
                  "0%, 100%": {
                    boxShadow: "0 0 0 0 rgba(102, 126, 234, 0.5)",
                    transform: "scale(1)",
                  },
                  "50%": {
                    boxShadow: "0 0 12px 6px rgba(102, 126, 234, 0)",
                    transform: "scale(1.02)",
                  },
                },
                "@keyframes surveyShimmer": {
                  "0%": { backgroundPosition: "0% 50%" },
                  "50%": { backgroundPosition: "100% 50%" },
                  "100%": { backgroundPosition: "0% 50%" },
                },
                backgroundSize: "200% 200%",
              }}
            >
              <IconButton
                size="small"
                onClick={() => {
                  localStorage.setItem("surveyClosed", "true");
                  setSurveyDismissed(true);
                }}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  color: "rgba(255,255,255,0.7)",
                  "&:hover": { color: "#fff" },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Typography
                variant="body1"
                sx={{ fontWeight: "bold", color: "#fff", mb: 1 }}
              >
                Pomoz mi s novým projektem!
              </Typography>
              <Button
                variant="contained"
                href={SURVEY_URL}
                target="_blank"
                rel="noopener"
                sx={{
                  backgroundColor: "#fff",
                  color: "#764ba2",
                  fontWeight: "bold",
                  textTransform: "none",
                  fontSize: "1rem",
                  px: 3,
                  whiteSpace: "nowrap",
                  "&:hover": { backgroundColor: "#f0e6ff" },
                }}
              >
                Vyplnit krátký dotazník →
              </Button>
            </Box>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
};

export default EndGameModal;
