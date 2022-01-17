// import Bugsnag from "@bugsnag/js";
// import BugsnagPluginReact from "@bugsnag/plugin-react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import theme from "./theme";

// Bugsnag.start({
//   apiKey: "cf18ffb74341638909c7b250c17b8718",
//   plugins: [new BugsnagPluginReact()],
// });
// const ErrorBoundary = Bugsnag.getPlugin("react").createErrorBoundary(React);

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
