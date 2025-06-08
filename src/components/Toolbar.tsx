// src/components/Toolbar.tsx
import { Component, For } from "solid-js";
import styles from "./Toolbar.module.css";
import { Tool } from "../lib/types";

interface ToolbarProps {
  selectedTool: Tool | null;
  setSelectedTool: (tool: Tool) => void;
  resetPolygon: () => void;
}

const TOOL_CONFIG: { tool: Tool; label: string }[] = [
  { tool: "select", label: "Select" },
  { tool: "line", label: "Line" },
  { tool: "square", label: "Square" },
  { tool: "circle", label: "Circle" },
  { tool: "cone", label: "Cone" },
  { tool: "polygon", label: "Polygon" },
  { tool: "note", label: "Note" },
  { tool: "measure", label: "Measure" }
];

const Toolbar: Component<ToolbarProps> = ({ selectedTool, setSelectedTool, resetPolygon }) => {
  return (
    <div class={styles.toolbar}>
      <For each={TOOL_CONFIG}>
        {({ tool, label }) => (
          <button
            class={`${styles.toolButton} ${selectedTool === tool ? styles.active : ""}`}
            onClick={() => {
+            console.log("Toolbar button clicked:", tool);
              setSelectedTool(tool);
              if (tool !== "polygon") resetPolygon();
            }}
          >
            {label}
          </button>
        )}
      </For>
    </div>
  );
};

export default Toolbar;
