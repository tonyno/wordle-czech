import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetStats } from "../../lib/dataAdapter";
import { logMyEvent } from "../../lib/settingsFirebase";
import { usePlayer } from "../../lib/PlayerContext";
import { useGameHistory, usePersonalStats } from "../../lib/syncService";
import MyAlert from "../alerts/MyAlert";
import MainLoader from "../muiStyled/MainLoader";
import { HistoryDayCard } from "./HistoryDayCard";
import PageTitle from "./PageTitle";
import { getPersonalScore } from "./statisticsLib";

const Statistics = () => {
  const { token } = usePlayer();
  const { stats: personalStats, loading: loadingPersonalStats } =
    usePersonalStats(token);
  const { history: myStatsLocalStorage, loading: loadingHistory } =
    useGameHistory(token);
  const [stats, loadingStats, errorStats] = useGetStats();
  const navigate = useNavigate();

  React.useEffect(() => {
    logMyEvent("stats");
  }, []);

  const data = useMemo(
    () =>
      myStatsLocalStorage ? getPersonalScore(myStatsLocalStorage, stats) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, myStatsLocalStorage]
  );

  if (loadingStats || loadingHistory || loadingPersonalStats) {
    return <MainLoader title="Načítám statistiku hráčů...." />;
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
      <PageTitle title="Osobní statistika" />
      {errorStats && (
        <MyAlert
          open={true}
          onClose={() => {}}
          message={
            "Nepodařilo se načíst statistiku. Ujistěte se, že máte funkční připojení k internetu. Chyba: " +
            errorStats.message
          }
          variant="error"
        />
      )}

      <Grid container alignItems="stretch" spacing={2} sx={{ pt: 2 }}>
        {data?.percentil && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography
                  variant="h3"
                  component="div"
                  sx={{ fontWeight: 500 }}
                >
                  {"" + data?.percentil + "%"}
                </Typography>
                <Typography>
                  Jste lepší než {"" + data?.percentil + "%"} hráčů hry.
                </Typography>
                <Typography>
                  Počítáno z {data?.playedGames} dokončených her z{" "}
                  {data?.totalGames}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{ mt: 1 }}
                >
                  Započítávají se hry od 20.1., které jste dohrál/a + pro které
                  byla již spočítána statistika všech hráčů (neobsahuje aktuální
                  den). Nejlepšího score dosáhnete dohráním <b>všech</b> her od
                  20.1.2022 na co nejméně pokusů.
                </Typography>
              </CardContent>
              <CardActions disableSpacing>
                <Button size="small" onClick={() => navigate("/history")}>
                  Porovnat s hráči
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          {personalStats && personalStats.guessesDistribution && (
            <HistoryDayCard
              distribution={personalStats.guessesDistribution}
              mode="personal"
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Statistics;
