import { expect, test } from "bun:test";
import { join } from "node:path";

const engine = join(import.meta.dir, "..", "bin", "pack_and_ask.py");

test("insane-review launches headless by default and visible only for login", () => {
  const probe = String.raw`
import importlib.util
import subprocess
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("insane_review", sys.argv[1])
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

commands = []
kills = []
engine.BROWSER_PROFILE_DIR = Path("/tmp/insane-review-headless-contract")
engine._close_profile_browser = lambda: kills.append(True) or True
engine.time.sleep = lambda _: None
engine.is_port_open = lambda *args: True
engine.cdp_browser_ok = lambda: True
engine.subprocess.run = lambda *args, **kwargs: subprocess.CompletedProcess(args[0], 0, "Google Chrome 150.0.0.0", "")
engine.subprocess.Popen = lambda cmd, **kwargs: commands.append(cmd)

assert engine.launch_browser_exe("/browser", restart=True)
assert "--headless=new" in commands[-1]
assert any(arg.startswith("--user-agent=") and "HeadlessChrome" not in arg for arg in commands[-1])
assert commands[-1][-1] == engine.CHATGPT_URL

assert engine.launch_browser_exe("/browser", visible=True, restart=True)
assert "--headless=new" not in commands[-1]
headless_ua = next(arg for arg in commands[-2] if arg.startswith("--user-agent="))
visible_ua = next(arg for arg in commands[-1] if arg.startswith("--user-agent="))
assert headless_ua == visible_ua
assert "Chrome/150.0.0.0" in visible_ua
assert commands[-1][-1] == engine.CHATGPT_URL
assert len(kills) == 2

config = Path("/tmp/insane-review-browser-choice.json")
engine.CONFIG_PATH = config
engine.save_browser_choice("/custom/browser/chrome")
assert engine._load_config()["browser"] == "/custom/browser/chrome"
config.unlink(missing_ok=True)
`;

  const result = Bun.spawnSync(["python3", "-c", probe, engine], {
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(result.exitCode, result.stderr.toString()).toBe(0);
});
