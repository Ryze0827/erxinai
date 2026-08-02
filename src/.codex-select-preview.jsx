import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "./console/i18n";
import { Field, SelectInput } from "./console/UI";
import "./cascade.css";
import "./console/console.css";
import "./theme.css";

const groups = ["全部分组", "无分组", "Plus号池", "Pro号池", "Claude Code", "Claude Code内部专线", "Codex Plus 内部专线", "Codex Plus 中级专线 1", "Codex Plus 高级专线 1", "生图", "Claude MAX号池"];

function Preview() {
  const [group, setGroup] = useState("全部分组");
  const [status, setStatus] = useState("全部");
  const [theme, setTheme] = useState("light");
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.consoleTheme = next;
  };

  return (
    <main className="console-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <section className="console-panel" style={{ width: "min(720px, 100%)", overflow: "visible", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <Field label="分组" className="is-wide">
            <SelectInput aria-label="分组" value={group} onChange={(event) => setGroup(event.target.value)}>
              {groups.map((item) => <option value={item} key={item}>{item}</option>)}
            </SelectInput>
          </Field>
          <Field label="状态">
            <SelectInput aria-label="状态" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="全部">全部</option>
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </SelectInput>
          </Field>
          <button className="console-button" type="button" onClick={toggleTheme}>切换主题</button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<LocaleProvider><Preview /></LocaleProvider>);
