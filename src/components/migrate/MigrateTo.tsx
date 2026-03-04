import { Button, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { getMigrationData } from "../../lib/dataAdapter";

const MigrateTo = () => {
  const [guid, setGuid] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleImport = async () => {
    if (!guid.trim()) return;
    try {
      const data = await getMigrationData(guid.trim());
      if (!data) {
        setStatus("error");
        setErrorMsg("Migrace s tímto kódem nebyla nalezena.");
        return;
      }
      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMsg("Chyba při načítání dat: " + String(e));
    }
  };

  return (
    <>
      <Typography variant="h6" sx={{ m: 2 }}>
        Zadejte kód pro migraci:
      </Typography>
      <TextField
        sx={{ m: 2 }}
        value={guid}
        onChange={(e) => setGuid(e.target.value)}
        label="Kód migrace"
        fullWidth
      />
      <Button variant="contained" sx={{ m: 2 }} onClick={handleImport}>
        Importovat
      </Button>
      {status === "success" && (
        <>
          <Typography sx={{ m: 2 }} color="success.main">
            Data byla úspěšně importována. Doporučujeme obnovit stránku.
          </Typography>
          <Button
            variant="outlined"
            sx={{ m: 2 }}
            onClick={() => window.location.reload()}
          >
            Obnovit stránku
          </Button>
        </>
      )}
      {status === "error" && (
        <Typography sx={{ m: 2 }} color="error">
          {errorMsg}
        </Typography>
      )}
    </>
  );
};

export default MigrateTo;
