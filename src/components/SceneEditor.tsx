// src/components/SceneEditor.tsx
import { createSignal } from "solid-js";
import styles from "./SceneEditor.module.css";

export default function SceneEditor() {
  const [debugInfo] = createSignal("SceneEditor loaded (DM only)");

  return (
    <div class={styles.dmPanel}>
      <strong>DM Controls</strong>
      <div>{debugInfo()}</div>
      {/* Add visibility toggles, object inspector, fog of war, etc. */}
    </div>
  );
}
