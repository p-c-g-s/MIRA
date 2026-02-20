import { getCurrentWindow } from "@tauri-apps/api/window";
import { Canvas } from "./components/Canvas";
import { About } from "./components/About";
import { Toolbar } from "./components/Toolbar";

const windowLabel = getCurrentWindow().label;

export default function App() {
  if (windowLabel.startsWith("overlay")) return <Canvas />;
  if (windowLabel === "toolbar") return <Toolbar />;
  if (windowLabel === "about") return <About />;
  return (
    <div className="flex items-center justify-center h-screen text-white bg-neutral-900">
      Unknown window: {windowLabel}
    </div>
  );
}
