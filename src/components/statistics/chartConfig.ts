export const DEFAULT_BAR_COLORS = [
  "#c0cccf",
  "#c0cccf",
  "#c0cccf",
  "#c0cccf",
  "#c0cccf",
  "#c0cccf",
  "#d47070",
];

export const baseChartOptions = () => ({
  colors: [...DEFAULT_BAR_COLORS],
  plotOptions: {
    bar: {
      distributed: true,
    },
  },
  legend: {
    show: false,
  },
  tooltip: {
    fixed: {
      enabled: false,
    },
    x: {
      show: false,
    },
    marker: {
      show: false,
    },
  },
});
