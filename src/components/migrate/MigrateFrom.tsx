import { Button, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { saveMigrationData } from "../../lib/dataAdapter";
import { generateUUID } from "../../lib/other";

const MigrateFrom = () => {
  const [guid, setGuid] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const migrate = async () => {
      const id = generateUUID();
      const data: Record<string, string> = {};
      for (const key of Object.keys(localStorage)) {
        if (/^__.*__$/.test(key)) continue;
        data[key] = localStorage.getItem(key) ?? "";
      }
      try {
        await saveMigrationData(id, data);
        setGuid(id);
      } catch (e) {
        setError("Chyba při ukládání dat: " + String(e));
      } finally {
        setLoading(false);
      }
    };
    migrate();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <>
      <Typography variant="h6" sx={{ m: 2 }}>
        Kód pro migraci:
      </Typography>
      <Typography sx={{ m: 2, fontFamily: "monospace", fontSize: "1.2rem" }}>
        {guid}
      </Typography>
      <Button
        variant="contained"
        sx={{ m: 2 }}
        onClick={() => {
          navigator.clipboard.writeText(guid);
        }}
      >
        Zkopírovat do schránky
      </Button>
    </>
  );
};

export default MigrateFrom;
