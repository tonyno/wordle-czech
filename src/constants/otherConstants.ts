// export const startDate = new Date(2022, 0, 14, 18, 0);

function isDST(): boolean {
  const actualDate = new Date();
  let jan = new Date(actualDate.getFullYear(), 0, 1).getTimezoneOffset();
  let jul = new Date(actualDate.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== actualDate.getTimezoneOffset();
}

export const startDate = new Date(Date.UTC(2022, 0, 14, isDST() ? 16 : 17, 0));
//export const startDate = new Date(2022, 0, 14, 0, 35);
export const msInDay = 86400000;
export const ourUrl = "https://hadejslova.cz/";
