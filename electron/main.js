const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, '../src/assets/icon.png'),
        title: 'Quizizz bot',
        minWidth: 750,
        minHeight: 550,
        width: 750,
        height: 550,
        resizable: true,
        maximizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
    createWindow();

    // For OSX
    app.on('activate', () => {
        const allWindows = BrowserWindow.getAllWindows()
        allWindows.length === 0 ? createWindow() : allWindows[0].focus();
    });
})

app.on('window-all-closed', function () {
    mainWindow = null
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const { getAnswersFromQuizit, getAnswersFromSchoolCheats } = require('../modules/quizizz-bot');


ipcMain.handle('showErrorBox', (event, title, content) => {
    dialog.showErrorBox(title, content);
});
  
ipcMain.handle('getAnswers', async (event, roomCode) => {
    if (roomCode.length === 0) {
        throw new Error('Invalid room code');
    }

    const answers1 = [
        {
            question: 'Were Sarah, Megan and Lil in the park last night?',
            answer: ["No, they weren't"]
        },
        {
            question: 'I _________ yesterday because after I watched "Frozen"',
            answer: ['cried']
        },
        {
            question: "We didn't ___________ the film last night",
            answer: ['watch']
        },
        {
            question: 'Past Simple of the verb to get is _____',
            answer: ['got']
        },
        { question: 'Where ___ you last weekend?', answer: ['were'] },
        {
            question: 'Past Simple of the verb to be is______',
            answer: ['was', 'were', 'was were']
        },
        {
            question: 'She _______ at the FPT last week',
            answer: ["wasn't"]
        },
        {
            question: 'My sister and I _____ in Scotland last year',
            answer: ['were']
        },
        {
            question: 'My mum _________ me a new bike for my birthday',
            answer: ['gave']
        },
        {
            question: 'Where was Ann this morning?',
            answer: ['she was at work']
        },
        {
            question: 'Past Simple of the verb to read is _____',
            answer: ['read']
        },
        {
            question: 'Past Simple of the verb to drink is ______',
            answer: ['drank']
        },
        {
            question: '. _______ you go to the cinema last weekend?',
            answer: ['Did']
        },
        { question: 'Yesterday______a nice day', answer: ['was', 'Was'] },
        {
            question: 'Where was Lily last year?',
            answer: ['She was in France']
        },
        {
            question: 'Last night we ___________ pizza for dinner',
            answer: ['ate']
        },
        {
            question: 'What did they do last weekend?',
            answer: [
                'They played games',
                'They played video games',
                'they played games'
            ]
        },
        {
            question: 'Where did they go yesterday evening?',
            answer: [
                'They went to the cinema',
                'They went to cinema',
                'went to cinema'
            ]
        },
        {
            question: 'Pas Simple of the verb to come is ______',
            answer: ['came']
        },
        {
            question: 'Did she eat a hamburger for lunch?',
            answer: ['Yes she did', 'Yes, she did']
        },
        {
            question: 'When I_______10 years old I liked princesses',
            answer: ['was', 'Was']
        }
    ];

    // const answers = getAnswersFromQuizit(roomCode);
    // const answers = [];
    const answers = await getAnswersFromSchoolCheats(roomCode);
    // if (!answers || answers.length === 0) {
    //     throw new Error('Failed to get answers');
    // }
    return answers;
});