const { app, BrowserWindow, net, protocol, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_HOST = "cloud-island";
const APP_PROTOCOL = "app";
const APP_URL = `${APP_PROTOCOL}://${APP_HOST}/index.html`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);

function getAppRoot() {
  return path.resolve(__dirname, "..");
}

function getDistRoot() {
  return path.join(getAppRoot(), "dist");
}

function resolveDistPath(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== APP_HOST) {
    return null;
  }

  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const resolvedPath = path.resolve(getDistRoot(), `.${pathname}`);
  const distRoot = getDistRoot();
  const isInsideDist = resolvedPath === distRoot || resolvedPath.startsWith(`${distRoot}${path.sep}`);
  return isInsideDist ? resolvedPath : null;
}

function registerAppProtocol() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    const filePath = resolveDistPath(request.url);
    if (!filePath || !fs.existsSync(filePath)) {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    title: "云屿回晴",
    backgroundColor: "#d8f4ff",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_PROTOCOL}://${APP_HOST}/`)) {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(APP_URL);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    registerAppProtocol();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("second-instance", () => {
    const [mainWindow] = BrowserWindow.getAllWindows();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
