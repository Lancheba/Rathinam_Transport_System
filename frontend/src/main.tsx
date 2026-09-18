import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #030712; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0f172a; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  input:focus { outline: 2px solid #3b82f6; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
