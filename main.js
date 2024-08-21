const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const screenshot = require('screenshot-desktop');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const path = require('path');

let mainWindow;
let captureEnabled = true;
let ocrResults = []; // Lista para armazenar os resultados do OCR

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 300,
        height: 500,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('status', { captureEnabled, ocrResults });
    });
}

app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('z', async () => {
        if (!captureEnabled) return;

        console.log('Tecla "Z" pressionada, capturando a tela...');

        try {
            const img = await screenshot({ format: 'png' });
            const image = await Jimp.read(img);

            const x = 780;
            const y = 480;
            const width = 370;
            const height = 200;

            image.crop(x, y, width, height);
            const croppedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

            Tesseract.recognize(croppedBuffer, 'eng').then(({ data: { text } }) => {
                const textArray = text.split('\n');

                // Adiciona o resultado do OCR à lista
                ocrResults.push({ textArray, image: croppedBuffer.toString('base64') });

                mainWindow.webContents.send('ocr-result', ocrResults);
            });
        } catch (err) {
            console.error('Erro ao capturar a tela:', err);
        }
    });

    globalShortcut.register('x', () => {
        captureEnabled = !captureEnabled;
        console.log(`Captura de tela ${captureEnabled ? 'ativada' : 'desativada'}`);
        mainWindow.webContents.send('status', { captureEnabled, ocrResults });
    });

    ipcMain.on('toggle-capture', () => {
        captureEnabled = !captureEnabled;
        console.log(`Captura de tela ${captureEnabled ? 'ativada' : 'desativada'}`);
        mainWindow.webContents.send('status', { captureEnabled, ocrResults });
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
