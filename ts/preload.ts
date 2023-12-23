/**
 * 預載腳本 preload
 * 主世界
 */

import { ipcRenderer, contextBridge } from 'electron'

window.addEventListener('DOMContentLoaded', () => {
    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency]!)
    }
})

/** 
 * https://www.electronjs.org/zh/docs/latest/tutorial/ipc
 * IPC = Inter-Process Communication = 進程間通信
 * 以下都為IPC通道
 * 可參考第一行相關網址
 */ 

// #region 主進程(main.ts)與預載腳本(preload.ts)的溝通

// const apiUrl = 'https://west.albion-online-data.com/api/v2/stats/Gold'
// const itemUrl = `https://west.albion-online-data.com/api/v2/stats/Prices/T6_2H_SHAPESHIFTER_MORGANA%403.JSON`
// const iconUrl = 'https://render.albiononline.com/v1/item/T4_OFF_SHIELD@1.png'

// ipcRenderer.send('api-response', iconUrl)

// ipcRenderer.on('api-response', (event, response) => {
//     console.log(event)
//     console.log('API Response', response)
// })

// ipcRenderer.send('some-message', 'Hello Jake')

ipcRenderer.on('some-message', (event, response) => {
    console.log(response)
})

/**
 * 取版本號的channel
 */
ipcRenderer.send('get-app-version')
ipcRenderer.on('app-version', (event, appVersion) => {
    console.log('version: ', appVersion)
    replaceText('app-version', `v${appVersion}`)
})

// #endregion 主進程(main.ts)與預載腳本(preload.ts)的溝通

// 主世界(main + preload)與隔離世界(main + preload 以外 e.g. renderer)的橋樑
// #region contextBridge

// 打 Albion 官方 API 包
contextBridge.exposeInMainWorld('trackerPackAPI', {
    trackPrices: (Url: string) => ipcRenderer.invoke('getPrices', Url),
})

// 取 Albion 官方資料
contextBridge.exposeInMainWorld('baseDataAPI', {
    // GitHub 基本世界物件
    getItems: (Url: string) => ipcRenderer.invoke('getItems', Url),
    // item icon (併發請求)
    getIcons: (Url: string[]) => ipcRenderer.invoke('getIcons', Url),
})

// #endregion contextBridge

// #region custom Methods

/**
 * 版本號渲染器
 * @param selector 
 * @param text 
 */
const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector)

    if (element)
        element.innerText = text
}

// #endregion custom Methods
