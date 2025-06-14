// src/components/RightPanel.tsx
import { createSignal, For, Show } from "solid-js";
import styles from "./RightPanel.module.css";

const tabs = [
  { id: "tokens", label: "Token images", icon: "icon-person-circle" },
  { id: "scene", label: "Scene options", icon: "icon-easel" },
  { id: "players", label: "Players", icon: "icon-people-fill" },
  { id: "dice", label: "Dice", icon: "icon-hourglass-split" },
  { id: "lobby", label: "Lobby", icon: "icon-globe-americas" },
  { id: "settings", label: "Settings", icon: "icon-wrench-adjustable-circle" }
];

export default function RightPanel() {
  const [selectedTab, setSelectedTab] = createSignal("scene");
  const [expanded, setExpanded] = createSignal(true);

  return (
    <div class={styles.layoutPanel}>
      <div class={styles.panel} data-expanded={expanded()}>
        <ul class={styles.panelTabs} role="tablist" aria-orientation="vertical">
          <For each={tabs}>
            {tab => (
              <li
                class={styles.panelTabsTab}
                role="tab"
                aria-selected={selectedTab() === tab.id}
              >
                <label aria-label={tab.label}>
                  <input
                    type="radio"
                    name="panel"
                    checked={selectedTab() === tab.id}
                    onChange={() => setSelectedTab(tab.id)}
                  />
                  <svg class={styles.icon} width="22" height="22" role="presentation">
                    <use href={`/assets/icons.svg#${tab.icon}`} />
                  </svg>
                </label>
              </li>
            )}
          </For>
          <li class={styles.panelTabsControl} role="tab">
            <button
              type="button"
              aria-label="Collapse or expand"
              onClick={() => setExpanded(v => !v)}
            >
              <svg class={styles.icon} width="22" height="22" role="presentation">
                <use
                  href={`/assets/icons.svg#${
                    expanded() ? "icon-chevron-double-right" : "icon-chevron-double-left"
                  }`}
                />
              </svg>
            </button>
          </li>
        </ul>

        <Show when={expanded()}>
          <div class={styles.form} role="tabpanel">
            <div class={styles.formContainer}>
              <div class={styles.formContent}>
                <h2>{tabs.find(t => t.id === selectedTab())?.label}</h2>
                <p>[Placeholder content for {selectedTab()} panel]</p>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
