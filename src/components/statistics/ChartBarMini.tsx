import { useTheme } from "@mui/material";
import Chart from "react-apexcharts";
import { baseChartOptions } from "./chartConfig";

export type ChartProps = {
  guessesDistribution?: number[];
  myScore?: number | null;
};

const ChartBarMini = ({ guessesDistribution, myScore }: ChartProps) => {
  const theme = useTheme();
  const base = baseChartOptions();

  if (myScore) {
    base.colors[myScore - 1] = theme.wordle.cell.correct.bgcolor;
  }

  const graphData = {
    options: {
      ...base,
      chart: {
        id: "basic-bar",
        sparkline: {
          enabled: true,
        },
      },
      plotOptions: {
        bar: {
          ...base.plotOptions.bar,
          barHeight: "100%",
          horizontal: false,
          dataLabels: {
            position: "bottom",
          },
        },
      },
      tooltip: {
        ...base.tooltip,
        y: {
          title: {
            formatter: function (seriesName: any) {
              return "";
            },
          },
        },
      },
    },
    series: [
      {
        data:
          guessesDistribution && guessesDistribution.length === 7
            ? guessesDistribution
            : [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  };

  return (
    <Chart
      options={graphData.options}
      series={graphData.series}
      type="bar"
      height={100}
    />
  );
};

export default ChartBarMini;
