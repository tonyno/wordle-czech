import { useEffect } from "react";
import { useGetWordOfDay } from "../lib/dataAdapter";
import { ApplicationContext } from "../lib/playContext";
import { getDateFromSolutionIndex, getWordIndex } from "../lib/words";
import WordlePlay from "./WordlePlay";
import MyAlert from "./alerts/MyAlert";
import MainLoader from "./muiStyled/MainLoader";

type Props = {
  appContext: ApplicationContext;
  setNewMessage: (newText: string) => void;
};

const WordlePlayContext = ({ appContext, setNewMessage }: Props) => {
  const [playContext, loading, currentWordError] = useGetWordOfDay(
    getDateFromSolutionIndex(appContext.solutionIndex)
  );

  // const x = new Date();
  // console.log(x);
  // console.log(Math.round(x.getTime() / 1000));
  // const y = new Date(2022, 1, 5, 17, 50);
  // console.log(Math.round(y.getTime() / 1000) - Math.round(x.getTime() / 1000));
  // const z = new Date(Date.UTC(2022, 1, 5, 17, 50));
  // console.log(z);

  // const x = new Date(Date.UTC(2022, 0, 14, 17, 0));
  // const y = new Date();
  // console.log((x.getTime() - y.getTime()) % 86400000);

  // let d = new Date("2022-02-05T18:30:00.000+00:00");
  // let now = new Date();
  // console.log(now.getTime() - d.getTime());

  useEffect(() => {
    if (playContext && playContext.solutionIndex === getWordIndex()) {
      setNewMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playContext]);

  return (
    <>
      {loading ? (
        <MainLoader title="Načítám další slovo..." />
      ) : (
        <>
          <WordlePlay playContext={playContext} />
        </>
      )}

      {currentWordError && (
        <MyAlert
          open={true}
          onClose={() => {}}
          message={
            "Nepodařilo se získat další slovo. Ujistěte se, že máte nastaveno správné systémové datum a máte funkční připojení k internetu. Chyba: " +
            currentWordError.message
          }
          variant="error"
        />
      )}
    </>
  );
};

export default WordlePlayContext;
