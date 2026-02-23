import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useState } from "react";
import { usePlayer } from "../../lib/PlayerContext";
import { enterExternalToken } from "../../lib/syncService";

type Props = {
  open: boolean;
  onClose: () => void;
};

const EnterTokenModal = ({ open, onClose }: Props) => {
  const { token, refreshToken } = usePlayer();
  const [inputToken, setInputToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    totalGames: number;
    merged: number;
    conflicts: number;
    error?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!token) return;
    setLoading(true);
    setResult(null);
    const res = await enterExternalToken(token, inputToken.toUpperCase());
    setResult(res);
    setLoading(false);
    if (res.success) {
      refreshToken();
    }
  };

  const handleClose = () => {
    setInputToken("");
    setResult(null);
    onClose();
  };

  const done = result?.success === true;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Zadat kód z jiného zařízení</DialogTitle>
      <DialogContent>
        {done ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CheckCircleOutlineIcon
              color="success"
              sx={{ fontSize: 48, mb: 1 }}
            />
            <Typography variant="h6" color="success.main" gutterBottom>
              Zařízení propojeno!
            </Typography>
            <Typography variant="body2">
              Nyní používáte kód <strong>{inputToken.toUpperCase()}</strong>
              {result.totalGames > 0 && (
                <> s {result.totalGames} uloženými hrami</>
              )}
              .
            </Typography>
            {result.merged > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Navíc bylo sloučeno {result.merged} her z tohoto zařízení.
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Obnovte stránku pro načtení her.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Zadejte 10znakový kód z jiného zařízení. Vaše hry budou sloučeny.
            </Typography>
            <TextField
              fullWidth
              label="Kód"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value.toUpperCase())}
              inputProps={{
                maxLength: 10,
                style: {
                  fontFamily: "monospace",
                  letterSpacing: "0.2em",
                },
              }}
              disabled={loading}
            />
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {result && !result.success && (
              <Typography color="error" sx={{ mt: 2 }}>
                {result.error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {done ? (
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Obnovit stránku
          </Button>
        ) : (
          <>
            <Button onClick={handleClose}>Zavřít</Button>
            <Button
              variant="contained"
              onClick={handleVerify}
              disabled={loading || inputToken.length !== 10}
            >
              Ověřit a sloučit
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EnterTokenModal;
