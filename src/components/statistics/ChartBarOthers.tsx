import Chart from "react-apexcharts";
import { baseChartOptions } from "./chartConfig";

export type ChartOthersProps = {
  guessesDistribution?: number[];
  myScore?: number | null;
  mode: "personal" | "others";
};

const ChartBarOthers = ({
  guessesDistribution,
  myScore,
  mode,
}: ChartOthersProps) => {
  const base = baseChartOptions();

  const annotations = myScore
    ? {
        points: [
          {
            x: "" + (myScore === 7 ? "N" : myScore),
            seriesIndex: 0,
            label: {
              borderColor: "#775DD0",
              offsetY: 40,
              style: {
                color: "#fff",
                background: "#775DD0",
              },
              text: "Vy",
            },
          },
        ],
      }
    : undefined;
  const sum = guessesDistribution
    ? guessesDistribution.reduce((sum, value) => sum + value, 0)
    : 0;

  const graphData = {
    series: [
      {
        name: "Počet her",
        data: guessesDistribution as number[],
      },
    ],
    options: {
      ...base,
      annotations: annotations,
      plotOptions: {
        bar: {
          ...base.plotOptions.bar,
          borderRadius: 0,
          dataLabels: {
            position: "top",
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return Math.round(100 * (val / sum)) + "%";
        },
        offsetY: -30,
        style: {
          fontSize: "12px",
          colors: ["#304758"],
        },
      },
      xaxis: {
        categories: ["1", "2", "3", "4", "5", "6", "N"],
        axisBorder: {
          show: true,
        },
        axisTicks: {
          show: true,
        },
        tickPlacement: "on",
        title: {
          text: "Pokus na který byla hra dokončena",
        },
      },
      yaxis: {
        axisBorder: {
          show: true,
        },
        axisTicks: {
          show: true,
        },
        labels: {
          show: true,
        },
        title: {
          text: "Počet her",
        },
      },
      chart: {
        toolbar: {
          show: false,
        },
      },
    },
  };

  return (
    <Chart
      options={graphData.options}
      series={graphData.series}
      type="bar"
      height={350}
    />
  );
};

export default ChartBarOthers;
