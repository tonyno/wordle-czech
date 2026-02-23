// Epoch for word index calculation.
// Must match src/constants/otherConstants.ts startDate.
// UTC noon ensures the day boundary at 18:00 CET / 19:00 CEST
// without needing DST detection.
export const startDate = new Date(Date.UTC(2022, 0, 14, 12, 0));
//export const startDate = new Date(2022, 0, 14, 0, 35);
export const msInDay = 86400000;

export const pad = (numv: number, size: number): string => {
  let num = numv.toString();
  while (num.length < size) num = "0" + num;
  return num;
};

// returns like 2022-01-19
export const dateToStr = (date: Date): string => {
  return (
    "" +
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1, 2) +
    "-" +
    pad(date.getDate(), 2)
  );
};

export const getWordIndex = (): number => {
  //return { solution: "ROBOT", solutionIndex: 1 };
  const epochMs = startDate.getTime();
  const now = Date.now();
  const index = Math.floor((now - epochMs) / msInDay);
  return index;
};

const addDays = (i: Date, days: number): Date => {
  const result = new Date(i);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDateFromSolutionIndex = (solutionIndex: number): Date => {
  const newDate = addDays(startDate, solutionIndex);
  return newDate;
};

export const timeToNextWord = (): number => {
  const epochMs = startDate.getTime();
  const now = Date.now();
  const t = msInDay - ((now - epochMs) % msInDay);
  return t;
  //return msToTime(t);
};
