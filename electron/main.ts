import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";
import { getDb } from "./db/database";

const resolveAppIcon = (): string | undefined => {
  const candidates = [
    join(process.resourcesPath, "icon.png"),
    join(app.getAppPath(), "build", "icon.png"),
    join(__dirname, "../../build/icon.png"),
  ];
  return candidates.find((path) => existsSync(path));
};

const createWindow = (): void => {
  const iconPath = resolveAppIcon();
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "Mentide",
    backgroundColor: "#F7EFE6",
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.platform === "darwin" && iconPath) {
    app.dock?.setIcon(nativeImage.createFromPath(iconPath));
  }
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

app
  .whenReady()
  .then(() => {
    try {
      getDb();
    } catch (error) {
      console.error(
        "Failed to open SQLite database. Run: npm run rebuild:electron\n",
        error
      );
      app.quit();
      return;
    }

    registerIpcHandlers(ipcMain);
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error(error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
