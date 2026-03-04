import { Box, CircularProgress, IconButton, Link, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { usePlayer } from "../lib/PlayerContext";
import { canShare } from "../lib/share";

const TokenDisplay = () => {
  const { token, migrating } = usePlayer();
  const [copied, setCopied] = useState(false);
  if (!token && !migrating) return null;

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!token || !navigator.share) return;
    navigator.share({
      title: "Hádej Slova - Můj kód",
      text: `Můj kód pro synchronizaci: ${token}`,
    });
  };

  if (migrating) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          py: 1,
          px: 2,
          mt: 2,
          opacity: 0.7,
          fontSize: "0.8rem",
        }}
      >
        <CircularProgress size={14} />
        <Typography variant="caption">
          Ukládám odehrané hry na server…
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          py: 1,
          px: 2,
          mt: 2,
          opacity: 0.7,
          fontSize: "0.8rem",
        }}
      >
        <Typography variant="caption">
          Váš kód: <strong>{token}</strong>
        </Typography>
        <IconButton size="small" onClick={handleCopy} title="Kopírovat kód">
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        {canShare() && (
          <IconButton size="small" onClick={handleShare} title="Sdílet kód">
            <ShareIcon fontSize="small" />
          </IconButton>
        )}
        {copied && (
          <Typography variant="caption" color="success.main">
            Zkopírováno!
          </Typography>
        )}
        <Typography variant="caption">
          <Link component={RouterLink} to="/settings" underline="hover">
            Přihlašte se na jiném zařízení
          </Link>
        </Typography>
      </Box>
    </>
  );
};

export default TokenDisplay;
