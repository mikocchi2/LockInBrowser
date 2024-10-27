const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let blockedDomains = [];

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'), // Use app.getAppPath() for packaged apps
      nodeIntegration: false,  
      contextIsolation: true,
      nativeWindowOpen: true,
      devTools: false
    },
    autoHideMenuBar: false,
  });

  // Load the main file using app.getAppPath()
  win.loadFile(path.join(app.getAppPath(), 'index.html'));

  // Set the window to full-screen
  win.setFullScreen(true);

  win.webContents.setWindowOpenHandler(({ url }) => {
    const isBlocked = blockedDomains.some(domain => url.includes(domain));
    if (!isBlocked) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: win,
          modal: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true,
          },
        },
      };
    } else {
      return { action: 'deny' };
    }
  });

  win.webContents.on('will-navigate', (event, url) => {
    const isBlocked = blockedDomains.some(domain => url.includes(domain));
    if (isBlocked) {
      event.preventDefault();
      win.loadFile(path.join(app.getAppPath(), 'index.html')); // Redirect to homepage if blocked
    }
  });

  win.webContents.on('new-window', (event, url) => {
    const isBlocked = blockedDomains.some(domain => url.includes(domain));
    if (isBlocked) {
      event.preventDefault();
    }
  });

  const menuTemplate = [
    {
      label: 'Menu',
      submenu: [
        {
          label: 'Home',
          click: () => {
            win.loadFile(path.join(app.getAppPath(), 'index.html')); // Redirect to the homepage
          }
        },
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Exit',
      click: () => {
        app.quit(); 
      },
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  return win;
}

app.whenReady().then(() => {
  // Load blocked domains from blocked_domains.txt
  const blockedData = fs.readFileSync(path.join(app.getAppPath(), 'blocked_domains.txt'), 'utf8');
  blockedDomains = blockedData.split(/\r?\n/).filter(Boolean).filter(line => !line.startsWith('#')).map(s => s.trim());
  console.log(blockedDomains);
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Read allowed_domains.txt and send data to the renderer process
ipcMain.handle('get-allowed-domains', async () => {
  try {
    const data = fs.readFileSync(path.join(app.getAppPath(), 'allowed_domains.txt'), 'utf8');
    const lines = data.split(/\r?\n/).filter(Boolean).filter(line => !line.startsWith('#')); // Ignore empty and comment lines
    const domains = lines.map(line => {
      const [name, pattern] = line.split('|').map(s => s.trim()); // Split by | and trim
      return { name, pattern };
    });
    return domains;
  } catch (err) {
    console.error(err);
    return [];
  }
});
