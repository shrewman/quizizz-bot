// The preload script runs before.
const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    let $ = document.querySelector.bind(document);

    contextBridge.exposeInMainWorld('api', {
        getAnswers: async (roomCode) => {
            return ipcRenderer.invoke('getAnswers', roomCode);
        },
        
        showErrorBox: (title, content) => { 
            ipcRenderer.invoke('showErrorBox', title, content);
        }
    });
});