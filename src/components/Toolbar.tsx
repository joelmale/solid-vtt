// src/components/Toolbar.tsx
import { Component, For, createSignal, onCleanup, onMount } from "solid-js";
import styles from "./Toolbar.module.css";
import { Tool } from "../lib/types";

interface ToolbarProps {
  selectedTool: Tool | null;
  setSelectedTool: (tool: Tool) => void;
  resetPolygon: () => void;
}

interface Position {
  x: number;
  y: number;
}

/**
 * Clamp a given position to stay within the visible viewport.
 *
 * @param pos - The position object with x and y values to clamp.
 * @param bounds - The maximum allowed width and height.
 * @returns A new clamped Position object that ensures the toolbar remains on screen.
 *
 * @example
 * ```ts
 * const clamped = clampPosition({ x: 2000, y: 1200 }, { width: 1920, height: 1080 });
 * console.log(clamped); // { x: 1720, y: 980 } (if toolbar is 200x100)
 * ```
 */
function clampPosition(
  pos: Position,
  bounds: { width: number; height: number }
): Position {
  const TOOLBAR_WIDTH = 200;
  const TOOLBAR_HEIGHT = 100;
  const safeX = isFinite(pos.x) && pos.x >= 0 ? pos.x : 0;
  const safeY = isFinite(pos.y) && pos.y >= 0 ? pos.y : 0;
  return {
    x: Math.max(0, Math.min(safeX, bounds.width - TOOLBAR_WIDTH)),
    y: Math.max(0, Math.min(safeY, bounds.height - TOOLBAR_HEIGHT)),
  };
}

const [tooltipForTool, setTooltipForTool] = createSignal<Tool | null>(null);
const [tooltipPos, setTooltipPos] = createSignal<{ x: number; y: number } | null>(null); // Signal to manage tooltip visibility
/**
 * showTooltip displays a tooltip for a specific tool.
 *
 * @param tool The tool to set the tooltip for.
 * Sets the tooltip to show for a specific tool, or hides it if null.
 */
function showTooltip(tool: Tool) {
  setTooltipForTool(tool);
  setTimeout(() => {
    // Only hide if still showing the same tool's tooltip
    if (tooltipForTool() === tool) {
      setTooltipForTool(null);
    }
  }, 3000);
}

const TOOL_CONFIG: { tool: Tool; label: string; tooltip?: string }[] = [
  {
    tool: "select",
    label: "Select",
    tooltip: "Click to select a shape,\nHold Shift+drag to select multiple\nPress Delete to remove"
  },
  { tool: "line", label: "Line" },
  { tool: "square", label: "Square" },
  { tool: "circle", label: "Circle" },
  { tool: "cone", label: "Cone" },
  { tool: "polygon", label: "Polygon" },
  { tool: "note", label: "Note" },
  { tool: "measure", label: "Measure" }
];

const Toolbar: Component<ToolbarProps> = ({ selectedTool, setSelectedTool, resetPolygon }) => {
  const [position, setPosition] = createSignal<Position>({ x: 100, y: 100 });
  const [dragging, setDragging] = createSignal(false);
  const offset = { x: 0, y: 0 };

  const handlePointerDown = (e: PointerEvent) => {
    offset.x = e.clientX - position().x;
    offset.y = e.clientY - position().y;
    setDragging(true);
    console.log("[DEBUG] Pointer down on grab handle", e.clientX, e.clientY); // cleanup later
    e.preventDefault();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging()) return;
    const newPos = clampPosition(
      { x: e.clientX - offset.x, y: e.clientY - offset.y },
      { width: window.innerWidth, height: window.innerHeight }
    );
    console.log("[DEBUG] Dragging to:", newPos); // cleanup later
    setPosition(newPos);
  };

  const handlePointerUp = () => {
    setDragging(false);
    localStorage.setItem("toolbarPos", JSON.stringify(position()));
    console.log("[DEBUG] Pointer up — ending drag"); // cleanup later
  };

  onMount(() => {
    const saved = localStorage.getItem("toolbarPos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Position;
        const clamped = clampPosition(parsed, {
          width: window.innerWidth,
          height: window.innerHeight,
        });
        setPosition(clamped);
      } catch {
        console.warn("[DEBUG] Invalid saved toolbarPos, resetting");
        setPosition({ x: 100, y: 100 });
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    console.log("[DEBUG] Toolbar mounted — drag listeners active"); // cleanup later

    onCleanup(() => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    });
  });

  console.log("[DEBUG] Rendered position:", position()); // cleanup later

  return (
      <>
        {/* Floating Tooltip */}
        {tooltipForTool() && tooltipPos() && (
          <div
            class={styles.tooltipBox}
            style={{
              position: "absolute",
              left: `${tooltipPos()!.x}px`,
              top: `${tooltipPos()!.y - 50}px`,
              transform: "translateX(-50%)",
            }}
          >
            {TOOL_CONFIG.find(t => t.tool === tooltipForTool())?.tooltip
              ?.split("\n")
              .map(line => <div>{line}</div>)}
          </div>
        )}

        {/* Toolbar Container */}
        <div
          class={styles.toolbar}
          style={{
            position: "fixed",
            left: `${position().x}px`,
            top: `${position().y}px`,
          }}
        >
          <div
            class={styles.grabHandle}
            onPointerDown={handlePointerDown}
            title="Drag Toolbar"
          >
            <For each={Array.from({ length: 9 })}>
              {() => <div />}
            </For>
          </div>

          <For each={TOOL_CONFIG}>
            {({ tool, label, tooltip }) => (
              <div class={styles.toolWrapper}>
                <button
                  class={styles.toolButton}
                  classList={{ [styles.active]: selectedTool === tool }}
                  onClick={(e) => {
                    setSelectedTool(tool);
                    if (tool !== "polygon") resetPolygon();

                    if (tooltip) {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltipForTool(tool);
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });

                      setTimeout(() => {
                        if (tooltipForTool() === tool) {
                          setTooltipForTool(null);
                          setTooltipPos(null);
                        }
                      }, 3000);
                    }
                  }}
                >
                  <svg class={styles.icon} aria-hidden="true">
                    <use href={`/assets/icons.svg#icon-${tool}`} />
                  </svg>
                  <span class={styles.label}>{label}</span>
                </button>
              </div>
            )}
          </For>
        </div>
      </>
    );

};

export default Toolbar;
