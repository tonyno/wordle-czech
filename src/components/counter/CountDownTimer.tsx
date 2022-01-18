import { Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { msInDay, startDate } from "../../constants/otherConstants";

type HoursMinSecs = {
  hours: number;
  minutes: number;
  seconds: number;
};

function msToTime(duration: number): HoursMinSecs {
  const retVal: HoursMinSecs = {
    seconds: Math.floor((duration / 1000) % 60),
    minutes: Math.floor((duration / (1000 * 60)) % 60),
    hours: Math.floor((duration / (1000 * 60 * 60)) % 24),
  };
  return retVal;
}

const timeToNextWord = (): number => {
  const epochMs = startDate.getTime();
  const now = Date.now();
  let t = msInDay - ((now - epochMs) % msInDay);
  return t;
  //return msToTime(t);
};

const pad = (numv: number, size: number): string => {
  let num = numv.toString();
  while (num.length < size) num = "0" + num;
  return num;
};

/**
 *
 * @returns String to display to user with remaining time. Or null if we run out of the time.
 */
const getDurationMsg = (): string | null => {
  let remaining = timeToNextWord();
  if (remaining > 23 * (1000 * 60 * 60) + 59 * (1000 * 60) + 57 * 1000)
    return null;
  let timeObj = msToTime(remaining);
  return (
    "Další slovo za " +
    pad(timeObj.hours, 2) +
    ":" +
    pad(timeObj.minutes, 2) +
    ":" +
    pad(timeObj.seconds, 2)
  );
};

// {`${hrs.toString().padStart(2, "0")}:${mins
//   .toString()
//   .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`}

const CountDownTimer = () => {
  const [timeStr, setTimeStr] = useState(getDurationMsg());
  const [stop, setStop] = useState(false);

  const tick = () => {
    if (stop) return;
    let timeStr = getDurationMsg();
    if (!timeStr) {
      setStop(true);
      setTimeStr("Nové slovo. Obnovte stránku.");
    } else {
      setTimeStr(timeStr);
    }
  };

  useEffect(() => {
    const timerId = setInterval(() => tick(), 1000);
    return () => clearInterval(timerId);
  });

  return (
    <Typography variant="body2" display="block" className="white">
      {timeStr}
    </Typography>
  );
};

export default CountDownTimer;