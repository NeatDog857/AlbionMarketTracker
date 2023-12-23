/**
 * 主進程 main
 * 主世界
 */

import { app, BrowserWindow, ipcMain, autoUpdater, dialog } from 'electron'
import path from 'node:path'
import axios from 'axios'
import { updateElectronApp } from 'update-electron-app'

const createWindow = (): void => {
    // Create the browser window
    const win: BrowserWindow = new BrowserWindow({
        width: 1200,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('index.html')

    // Open the DevTools.
    // win.webContents.openDevTools()
}

/**
 * 这段程序将会在 Electron 结束初始化
 * 和创建浏览器窗口的时候调用
 * 部分 API 在 ready 事件触发后才能使用。
 */
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        /**
         * 在 macOS 系统内, 如果没有已开启的应用窗口
         * 点击托盘图标时通常会重新创建一个新窗口
         */
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow()
    })

    app.on('window-all-closed', () => {
        /**
         * 除了 macOS 外，当所有窗口都被关闭的时候會自動退出程序。
         * 因此, 通常对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
         * 直到用户使用 Cmd + Q 明确退出
         * quitting the app when no windows are open on non-macOS platforms
         */
        if (process.platform !== 'darwin')
            app.quit()
    })
})

/** 
 * https://www.electronjs.org/zh/docs/latest/tutorial/ipc
 * IPC = Inter-Process Communication = 進程間通信
 * 以下都為IPC通道
 * 可參考第一行相關網址
 */ 

// begin 主進程(main.ts)與預載腳本(preload.ts)的溝通

// ipcMain.on('api-response', async (event, apiUrl) => {
//     try {
//         const response = await axios.get(apiUrl)
//         event.reply('api-response', response.data)
//         // console.log(response.data)
//     }
//     catch {
//         event.reply('api-response', { error: 'API Request Failed' })
//     }
// })

// ipcMain.on('some-message', (event, message) => {
//     console.log(message)
//     event.reply('some-message', message)
// })

/**
 * 取版本號的channel
 */
ipcMain.on('get-app-version', event => {
    const appVersion = app.getVersion()
    event.sender.send('app-version', appVersion)
})

// end 主進程(main.ts)與預載腳本(preload.ts)的溝通

//主世界(main + preload)與隔離世界(main + preload 以外 e.g. renderer)的橋樑
ipcMain.handle('getPrices', async (event, apiUrl): Promise<any> => {
    try {
        const response = await axios.get(apiUrl)
        return response.data
    }
    catch {
        return 'error'
    }
})

ipcMain.handle('getItems', async (event, gitHubUrl): Promise<any> => {
    try {
        const response = await fetch(gitHubUrl)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Network response was not ok: ${response.statusText}`);
                                }
                                return response.json();
                            })
                            .then(data => data)
                            .catch(error => error)
        return response
    }
    catch {
        return 'error'
    }
})

/**
 * 物品 Icon API
 * 併發處理
 */
ipcMain.handle('getIcons', async (event, iconUrlArr: string[]): Promise<string[]> => {
    try {
        // 併發 
        const responses: string[] = await Promise.all(iconUrlArr.map((url: string) => axios.get(url, { responseType: 'arraybuffer' })
                                                                            .then(res => {
                                                                                //將 Uint8Array 轉成 二進制
                                                                                const binaryData = Buffer.from(res.data)
                                                                                //將 二進制 轉成 string
                                                                                const base64String = binaryData.toString('base64')

                                                                                return base64String
                                                                            })
                                                                            .catch(error => {
                                                                                // 处理错误响应
                                                                                if (error.response && error.response.status === 404) {
                                                                                    return error.message
                                                                                    // 执行其他处理逻辑...
                                                                                } else {
                                                                                    return error.message
                                                                                }
                                                                            })))
        return responses
    }
    catch {
        return ['error']
    }
})

if (app.isPackaged) {
    updateElectronApp()
    // require('update-electron-app')()
    // console.log('in')
    // const server = 'https://github.com/NeatDog857/AlbionMarketTracker/releases/latest'
    // const url = `${server}/update/${process.platform}/${app.getVersion()}`

    // autoUpdater.setFeedURL({ url })
    // autoUpdater.checkForUpdates()
    // // setInterval(() => {
    // //     autoUpdater.checkForUpdates()
    // // }, 3600000) //一小時檢查一次
    // autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    //     const dialogOpts: Electron.MessageBoxOptions = {
    //       type: 'info',
    //       buttons: ['Restart', 'Later'],
    //       title: 'Application Update',
    //       message: process.platform === 'win32' ? releaseNotes : releaseName,
    //       detail:
    //         'A new version has been downloaded. Starta om applikationen för att verkställa uppdateringarna.'
    //     }
      
    //     dialog.showMessageBox(dialogOpts).then((returnValue) => {
    //       if (returnValue.response === 0) autoUpdater.quitAndInstall()
    //     })
    //   })

    //   autoUpdater.on('error', (error) => {
    //     // 在这里处理更新检查或下载过程中的错误
    //     console.error('AutoUpdater Error:', error.message);
    //   });
}