export type Tool =
  | "measure"
  | "note"
  | "circle"
  | "square"
  | "cone"
  | "line"
  | "polygon";

export const toolList: { name: Tool; label: string; icon: string }[] = [
  { name: "measure", label: "Measure", icon: "📏" },
  { name: "note", label: "Note", icon: "📝" },
  { name: "circle", label: "Circle", icon: "🟠" },
  { name: "square", label: "Square", icon: "⬛" },
  { name: "cone", label: "Cone", icon: "🔺" },
  { name: "line", label: "Line", icon: "📏" },
  { name: "polygon", label: "Polygon", icon: "⭐" }
];
