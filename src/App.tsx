// src/App.tsx
import RightPanel from "./components/RightPanel";
import SceneCanvas from "./components/SceneCanvas";
import Toolbar from "./components/Toolbar";
import SceneEditor from "./components/SceneEditor";
import SvgSprite from "./components/SvgSprite";
import { Tool } from "./lib/types";
import { createSignal } from "solid-js";

export default function App() {
  const [selectedTool, setSelectedTool] = createSignal<Tool>(null);

  const resetPolygon = () => {
    // optional shared reset logic
  };

  // Simulate DM flag (replace with Firebase, auth, or route check)
  const isDM = true; // set this based on login or game role

  // Temporary hardcoded scene ID for testing — later use auth/URL/etc.
  const sceneId = "demo-scene-001";

  return (
    <>
      <SvgSprite />

      {/* Shared Canvas */}
      <SceneCanvas
        sceneId={sceneId}
        selectedTool={selectedTool()}
        resetPolygon={resetPolygon}
      />

      {/* Shared Toolbar */}
      console.log("Rendering Toolbar from App.tsx");
      <Toolbar
        selectedTool={selectedTool()}
        setSelectedTool={setSelectedTool}
        resetPolygon={resetPolygon}
      />

      {/* DM-only tools */}
      {isDM && <SceneEditor />}

      {/* Right Panel */}
      <RightPanel />
    </>
  );
}
