// Epoch for word index calculation.
// Must match functions/src/words.ts startDate (UTC noon Jan 14, 2022).
// Using UTC noon ensures the day boundary at 18:00 CET / 19:00 CEST
// without needing DST detection.
export const startDate = new Date(Date.UTC(2022, 0, 14, 12, 0));
export const msInDay = 86400000;
export const ourUrl = "https://hadejslova.cz/";
