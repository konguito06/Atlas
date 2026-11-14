import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { openAtlasData } from "./lib/database";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in index.html");
}
const root = createRoot(container);

openAtlasData().then(
  (data) => {
    root.render(
      <StrictMode>
        <App data={data} />
      </StrictMode>,
    );
  },
  (error: unknown) => {
    // Without its database the app has nothing to show, so say so plainly.
    root.render(
      <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="font-heading text-2xl">ATLAS could not open its data</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The database on this Mac could not be opened. Quit and reopen the app.
          If this keeps happening, the details below will help fix it.
        </p>
        <pre className="max-w-md whitespace-pre-wrap text-xs text-muted-foreground">
          {String(error)}
        </pre>
      </main>,
    );
  },
);
