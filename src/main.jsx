import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { App } from "./App.jsx";
import "./appica.css";
import "./console/appica.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider storageKey="sentence_console_theme" defaultTheme="light" enableSystem={false}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
