import { GameType } from "./playerService";

export type ApplicationContext = {
  solutionIndex: number;
  typeOfGame: "wordle" | "challange" | "wordle-history";
};

export type PlayContext = {
  solution: string;
  solutionIndex: number;
  alertMessage?: string; // message to show on client's screen
  gameType?: GameType;
};

export const defaultPlayContext: PlayContext = {
  solution: "TONDA",
  solutionIndex: 1,
};
