import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import * as React from "react";
import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { signInWithGoogle, signOutUser } from "../../lib/authorization";
import {
  saveAllResultsToFirebase,
  saveSharedResult,
} from "../../lib/dataAdapter";
import {
  SettingsItem,
  getSettings,
  saveSettings,
} from "../../lib/localStorage";
import { usePlayer } from "../../lib/PlayerContext";
import { auth, logMyEvent } from "../../lib/settingsFirebase";
import { canShare } from "../../lib/share";
import { Cell } from "../grid/Cell";
import EnterTokenModal from "../modals/EnterTokenModal";
import PageTitle from "../statistics/PageTitle";

type PropType = {
  onThemeChange: (settings: SettingsItem) => void;
};

const Settings = ({ onThemeChange }: PropType) => {
  const [data, setData] = useState<SettingsItem>(getSettings());
  const [canBeUploadedToServer, setCanBeUploadedToServer] =
    useState<boolean>(true);
  const [user] = useAuthState(auth);
  const { token, refreshToken } = usePlayer();
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState<string>("");

  React.useEffect(() => {
    logMyEvent("settings");
  }, []);

  const save = (newData: SettingsItem) => {
    onThemeChange(newData);
    saveSettings(newData);
    setData(newData);
  };

  const changeDark = () => {
    save({ ...data, darkMode: !data.darkMode });
  };

  const changeColorBlind = () => {
    save({ ...data, colorBlindMode: !data.colorBlindMode });
  };

  const changeBigFont = () => {
    save({ ...data, bigFont: !data.bigFont });
  };

  const changeNickname = (s: string) => {
    save({ ...data, nickname: s });
  };

  const shareGameResultsToServer = async () => {
    setCanBeUploadedToServer(false);
    saveAllResultsToFirebase();
    await saveSharedResult();
  };

  const handleGoogleLogin = async () => {
    setGoogleAuthStatus("Přihlašování...");
    const result = await signInWithGoogle();
    if (result.success) {
      if (result.switchedToken) {
        refreshToken();
        setGoogleAuthStatus("Přihlášeno a sloučeno s existujícím účtem!");
      } else {
        setGoogleAuthStatus("Google účet propojen!");
      }
    } else {
      setGoogleAuthStatus("Přihlášení se nezdařilo.");
    }
  };

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareToken = () => {
    if (token && navigator.share) {
      navigator.share({
        title: "Hádej Slova - Můj kód",
        text: `Můj kód pro synchronizaci: ${token}`,
      });
    }
  };

  return (
    <Container maxWidth="md">
      <Box justifyContent="center" component="main" sx={{ flexGrow: 1, pt: 2 }}>
        <PageTitle title="Nastavení" />

        <Card sx={{ maxWidth: "md", mt: "1rem" }}>
          <CardContent>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom component="div">
                  Vzhled
                </Typography>
              </Grid>
              <Grid item xs={9}>
                Tmavý režim
              </Grid>
              <Grid item xs={3}>
                <Switch
                  checked={data.darkMode}
                  onChange={changeDark}
                  inputProps={{ "aria-label": "controlled" }}
                />
              </Grid>
              <Grid item xs={9}>
                Režim pro osoby se sníženou barvocitlivostí
              </Grid>
              <Grid item xs={3}>
                <Switch
                  checked={data.colorBlindMode}
                  onChange={changeColorBlind}
                  inputProps={{ "aria-label": "controlled" }}
                />
              </Grid>
              <Grid item xs={9}>
                Větší písmo
              </Grid>
              <Grid item xs={3}>
                <Switch
                  checked={data.bigFont}
                  onChange={changeBigFont}
                  inputProps={{ "aria-label": "controlled" }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom component="div">
                  Ukázka
                </Typography>
              </Grid>
              <Grid item xs={12} sx={{ mt: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "left",
                  }}
                >
                  <Cell value="K" status="present" skipAnimation={true} />
                  <Cell value="O" status="correct" skipAnimation={true} />
                  <Cell value="Č" status="absent" skipAnimation={true} />
                  <Cell value="K" status="present" skipAnimation={true} />
                  <Cell value="A" skipAnimation={true} />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  Písmeno <b>K</b> se ve slově vyskytuje. Písmeno <b>O</b> je
                  správně. Písmeno <b>Č</b> ve slově není.
                </Typography>
              </Grid>
            </Grid>{" "}
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: "md", mt: "1rem" }}>
          <CardContent>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom component="div">
                  Synchronizace napříč zařízeními
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Váš kód pro synchronizaci. Zadejte ho na jiném zařízení pro
                  přístup ke svým hrám.
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                      letterSpacing: "0.15em",
                    }}
                  >
                    {token || "Načítání..."}
                  </Typography>
                  <IconButton size="small" onClick={handleCopyToken}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  {canShare() && (
                    <IconButton size="small" onClick={handleShareToken}>
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  )}
                  {copied && (
                    <Typography variant="caption" color="success.main">
                      Zkopírováno!
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={() => setTokenModalOpen(true)}
                  sx={{ mt: 1 }}
                >
                  Zadat kód z jiného zařízení
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: "md", mt: "1rem" }}>
          <CardContent>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom component="div">
                  Přihlášení přes Google
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Propojte svůj Google účet pro automatickou synchronizaci na všech zařízeních.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                {user ? (
                  <Box>
                    <Typography variant="body2">
                      Přihlášen jako: {user.email}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={signOutUser}
                      sx={{ mt: 1 }}
                    >
                      Odhlásit se
                    </Button>
                  </Box>
                ) : (
                  <Button variant="contained" onClick={handleGoogleLogin}>
                    Login přes Google
                  </Button>
                )}
                {googleAuthStatus && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {googleAuthStatus}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ maxWidth: "md", mt: "1rem" }}>
          <CardContent>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom component="div">
                  Ukládání výsledků do cloudu
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="nickname"
                  label="Přezdívka"
                  value={data.nickname}
                  onChange={(event) => changeNickname(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  disabled={!canBeUploadedToServer}
                  onClick={() => shareGameResultsToServer()}
                >
                  Uložit výsledky do cloudu
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  Váš soukromý identifikátor (starý systém):
                </Typography>
                <code>{data.userId}</code>{" "}
                <Button
                  size="small"
                  onClick={() => {
                    if (data.userId) navigator.clipboard.writeText(data.userId);
                  }}
                >
                  (kopírovat do schránky)
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      <EnterTokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />
    </Container>
  );
};

export default Settings;
