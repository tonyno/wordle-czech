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
import {
  signInWithGoogle,
  signOutUser,
  sendEmailLink,
  completeEmailLinkSignIn,
} from "../../lib/authorization";

import {
  SettingsItem,
  getSettings,
  saveSettings,
} from "../../lib/localStorage";
import { usePlayer } from "../../lib/PlayerContext";
import { savePlayerSettings } from "../../lib/playerService";
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

  const [user] = useAuthState(auth);
  const { token, refreshToken } = usePlayer();
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState<string>("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<string>("");

  React.useEffect(() => {
    logMyEvent("settings");

    completeEmailLinkSignIn().then((result) => {
      if (!result) return;
      if (result.success) {
        if (result.switchedToken) {
          refreshToken();
          setGoogleAuthStatus("E-mail propojen a sloučeno s existujícím účtem!");
        } else {
          setGoogleAuthStatus("E-mail propojen!");
        }
      } else {
        setGoogleAuthStatus("Přihlášení e-mailem se nezdařilo.");
      }
    });
  }, [refreshToken]);

  const save = (newData: SettingsItem) => {
    onThemeChange(newData);
    saveSettings(newData);
    setData(newData);
    if (token) {
      savePlayerSettings(token, {
        darkMode: newData.darkMode,
        colorBlindMode: newData.colorBlindMode,
        bigFont: newData.bigFont,
        nickname: newData.nickname || "",
      }).catch((err) => console.error("Error saving settings to Firestore:", err));
    }
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
              <Grid item xs={12}>
                <Box
                  sx={{
                    mt: 1,
                    mb: 1,
                    p: 1.5,
                    backgroundColor: '#fdeded',
                    border: '1px solid #f5c6cb',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#721c24' }}>
                    Prosím, před přihlášením si zapište výše uvedený kód, který
                    jednoznačně identifikuje vaše odehrané hry. V případě
                    jakéhokoli problému se synchronizací bude možné vaše data
                    obnovit pomocí tohoto kódu. Přihlášením se kód zpravidla
                    změní.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                  Nebo propojte svůj Google účet pro automatickou synchronizaci.
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
                  <>
                    <Button variant="contained" onClick={handleGoogleLogin}>
                      Login přes Google
                    </Button>
                    <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                      Nebo se přihlaste pomocí e-mailu:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <TextField
                        size="small"
                        type="email"
                        placeholder="vas@email.cz"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Button
                        variant="outlined"
                        disabled={!email}
                        onClick={async () => {
                          setEmailStatus("Odesílání...");
                          const ok = await sendEmailLink(email);
                          setEmailStatus(
                            ok
                              ? "Odkaz odeslán! Zkontrolujte e-mail, případně složku spam."
                              : "Odeslání se nezdařilo."
                          );
                        }}
                      >
                        Odeslat odkaz
                      </Button>
                    </Box>
                    {emailStatus && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {emailStatus}
                      </Typography>
                    )}
                  </>
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

       
      </Box>

      <EnterTokenModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />
    </Container>
  );
};

export default Settings;
