/**
 * 此檔案為渲染器進程
 * 隔離世界
 * render = 渲染 
*/

// ---------------------全域變數 Begin------------------------

const maxResultCount: number = 50
// albion 全物品變數容器
let baseData: any[]
// icon src 暫存器 (src 存的是icon API 回傳處理後的 src)
let imgSrcArr: imgEleWithSrc[]
// icon Url 組合器的參數容器
let imgItemIDArr: string[] = []
// elements 存取區
let priceTable: DataTables.Api = null!
const filter = document.querySelector<HTMLButtonElement>('#filter')!
const priceQuery = document.querySelector<HTMLButtonElement>('#priceQuery')!
const detail1 = document.querySelector<HTMLDetailsElement>('#detail1')!
const overlay = document.querySelector<HTMLDivElement>('#overlay')!
const d1ItemContainer = document.querySelector<HTMLDivElement>('#d1ItemContainer')!
const blurItemInput = document.querySelector<HTMLInputElement>('#blurItemName')!
const itemInput = document.querySelector<HTMLInputElement>('#itemName')!
const tierSelector = document.querySelector<HTMLSelectElement>('#tierSelector')!
const enchantmentSelector = document.querySelector<HTMLSelectElement>('#enchantmentSelector')!
const qualitySelector = document.querySelector<HTMLSelectElement>('#qualitySelector')!
// elements 整合區 (for 選項 html 元素產生器打包用的參數格式)
const selectorArr: HTMLSelectElement[] = [tierSelector,enchantmentSelector,qualitySelector]
// API 存取區
const tpAPI = window.trackerPackAPI
const baseAPI = window.baseDataAPI

// url 存取區
// 金價 api url
const apiUrl = 'https://west.albion-online-data.com/api/v2/stats/Gold'
// 物品查價 api url 組合器
const getItemUrl = (itemIDList: string, format: string, locations: string, qualities: string): string => {
    const hasLocations: boolean = locations !== ''
    const hasQualities: boolean = qualities !== ''
    const hasExtraPara: boolean = hasLocations || hasQualities
    const questionMark: string = hasExtraPara? '?' : ''
    const andMark: string = hasLocations && hasQualities? '&' : ''
    const URIitemIDList: string = encodeURIComponent(itemIDList)
    const URILocations: string = hasLocations? `locations=${encodeURIComponent(locations)}` : locations
    const URIQualities: string = hasQualities? `qualities=${encodeURIComponent(qualities)}` : qualities

    return `https://west.albion-online-data.com/api/v2/stats/Prices/${URIitemIDList}.${format}${questionMark}${URILocations}${andMark}${URIQualities}`
}
// 全物品 github json url
const jsonUrl = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json'


// begin 相關 bluePrints 集合區

enum tierConfig {
    All,
    T1 = 'T1_',
    T2 = 'T2_',
    T3 = 'T3_',
    T4 = 'T4_',
    T5 = 'T5_',
    T6 = 'T6_',
    T7 = 'T7_',
    T8 = 'T8_',
}

enum enchantmentConfig {
    All,
    dot0 = '',
    dot1 = '@1',
    dot2 = '@2',
    dot3 = '@3',
    dot4 = '@4',
}

enum qualityConfig {
    All,
    Normal,
    Good,
    Outstanding,
    Excellent,
    Masterpiece,
}

/**
 * 查價結果 欄位名稱
 */
enum PriceResultTitle {
    item_id = '物品真名',
    city = '城市',
    quality = '品質',
    sell_price_min = '最低售出價格',
    sell_price_min_date = '最低售出價格日',
    sell_price_max = '最高售出價格',
    sell_price_max_date = '最高售出價格日',
    buy_price_min = '最低收購價格',
    buy_price_min_date = '最低收購價格日',
    buy_price_max = '最高收購價格',
    buy_price_max_date = '最高收購價格日',
}

type selectorPackage = {
    element: HTMLSelectElement,
    config: any,
}

// 物品 與 icon src 打包格式
type imgEleWithSrc = {
    Index: string,
    name: string,
    src: string,
}

// enum 整合區 (for 選項 html 元素產生器打包用的參數格式)
const configArr: any[] = [tierConfig, enchantmentConfig, qualityConfig]

// end 相關 bluePrints 集合區

// ---------------------全域變數 End------------------------

// ---------------------各式Function Begin------------------------

// 測試變數(部分不是)(for 組合url字串規則參考)
const itemID = 'T6_2H_SHAPESHIFTER_MORGANA' //物品唯一名稱
const cityName = `?locations=Lymhurst` //城市名稱
const Enchantment = `@4` //附魔
const qualities = `0` //品質
const format = 'json'

// 測試查價 T5_HIDE_LEVEL2@2
// const result: Promise<void> = tpAPI.trackPrices(getItemUrl("T5_HIDE_LEVEL2@2", format))

// result.then(data => {
//     console.log('from Renderer', data)
// })
const trackPrice = () => {
    const itemID = itemInput.value.trim()
    const location = 'lymhurst,martlock'
    const quality = qualitySelector.value

    if (itemID === '') {
        console.log('請先輸入物品後再查價')
        return
    }
    //測試每樣查詢條件傳多項(成功)
    // console.log(getItemUrl('T5_CAPEITEM_FW_BRIDGEWATCH@2,T6_2H_SHAPESHIFTER_MORGANA', format, location, '1'))

    const result: Promise<any[]> = tpAPI.trackPrices(getItemUrl(itemID, format, '', quality))

    result.then(data => {
        console.log('Price Result: ', data)
        priceInitOrRender(data)
    })
}

/**
 * 查價結果 Table 初始化或資料渲染
 */
const priceInitOrRender = (data: any[]) => {

    // 判斷是否已經初始化
    if ($.fn.dataTable.isDataTable('#priceResultTable')) {

        priceTable.clear()
        priceTable.rows.add(data).draw()

    } else if (data) {
        // 用 第一筆 data 製作欄位名稱 ( "無data會錯誤" 的例外狀況已在判斷式隔離完畢 )
        let columns: any[] = []
        const keysOfData: string[] = Object.keys(data[0])
        keysOfData.forEach(key => {
            const keyObj = {
                data: key,
                title: PriceResultTitle[key as keyof typeof PriceResultTitle],
            }
            columns.push(Object.assign({}, keyObj))
        });

        /**
         * priceTable初始化
         * 以下註解為說明
         * $(datatable_id).DataTable({
         *  設定屬性/預設功能區塊,
         *  設定資料來源區塊(data or ajax….等),
         *  設定資料欄位區塊(columns),
         *  設定語言區塊(language),
         *  設定欄位元素定義區塊(columnDefs),
         *  設定列元素區塊(rowCallback)…等
         * })
         */
        priceTable = $('#priceResultTable').DataTable({
            data: data,
            columns: columns,
            "scrollCollapse": true, // 預設為false 是否開始滾軸功能控制X、Y軸
            "scrollY": "400px",     // 若有設置為Y軸(垂直)最大高度
        });
    }
}

// element事件對應function 集合區
const test = () => {
    if (detail1.open) {
        console.log('open')
    }
}

/**
 * icon 數據處理器
 * 併發的方式發送請求
 * @param itemIDArr
 */
const imgDealer = async (itemIDArr: string[], quality?: typeof qualityConfig[keyof typeof qualityConfig]) => {
    console.log('圖示渲染 Begin')

    /**
     * icon api 篩選器
     * 
     * 將 itemIDArr 與 icon src 暫存器比對後把已經暫存過的ID剔除
     * 想法是大概率暫存器都是偏少的
     * 所以從暫存器中src不為空白的下手
     */
    const exsistIDArr: string[] = imgSrcArr.filter(row => row.src !== '').map(item => item.name)
    const filteredIDArr: string[] = itemIDArr.filter(id => !exsistIDArr.includes(id))
    
    /**
     * 物品 icon Url 組合器
     * 
     * 網址的參數說明:
     * 1. quality (integer, optional) - Sets the quality of the item. Defaults to 0. Valid values are 1 for Normal, 2 for Good, 3 for Outstanding, 4 for Excellent and 5 for Masterpiece
     * 2. size (integer, optional) - Sets width and height in px. Defaults to 217. Valid values are 1-217. Note that there will be a blank margin around the icon frame as item icons may be larger then the item frame itself
     */
    // -----------start------------
    const baseUrl: string = 'https://render.albiononline.com/v1/item/'
    const IDArr: string[] = filteredIDArr//['T5_CAPEITEM_FW_BRIDGEWATCH@1','T7_POTION_REVIVE@1']['T4_OFF_SHIELD','T4_OFF_SHIELD@1']
    let tempArr: string[] = []

    if (quality) {
        const q: string = String(quality)
        for (const i of IDArr) {
            tempArr.push(`${baseUrl}${i}.png?size=80&quality=${q}`)
        }
    } else {
        for (const i of IDArr) {
            tempArr.push(`${baseUrl}${i}.png?size=80`)
        }
    }
    // -----------end------------

    if (tempArr.length !== 0) {
        console.log('打')
        // 打 icon API
        const result: string[] = await baseAPI.getIcons(tempArr)
        
        // 將處理後的src存回暫存器中 (經過 icon api 篩選器的處理，這裡只會有未曾查過的icon)
        for (const i in IDArr) {
            const arr = imgSrcArr.find(item => item.name === IDArr[i])
            if (!arr) {
                console.log('暫存器存入錯誤')
                break
            }

            arr.src = `data:image/png;base64,${result[i]}`
        }
    }

    // 最後取用為篩選過的原始參數ID陣列，配合暫存器渲染圖示
    const rowsArr = imgSrcArr.filter(row => imgItemIDArr.includes(row.name))
    for (const row of rowsArr) {
        $(`#${row.Index}`).attr('src', row.src)
    }
    
    console.log('圖示渲染 Complete')
}

/**
 * 在filter結果中點選的物品會回傳id到查價input中
 * @param event 
 */
const transferToItemSelector = (event: any) => {
    
    let element = event.srcElement

    // 選到圖片時導向其父元素div
    if (element.localName === 'img')
    {
        element = element.parentElement
    }
    
    const dataRow = JSON.parse(element.dataset.row)

    itemInput.value = dataRow.UniqueName
}

/**
 * 物品總覽過濾器
 */
const filterBaseData = () => {
    let copyBaseData: any[] = baseData
    const blurItem: string = blurItemInput.value.trim().toLowerCase()
    const tier: string = tierSelector.value
    const enchantment: string = enchantmentSelector.value

    if (blurItem !== '') {
        copyBaseData = copyBaseData.filter(item => item.LocalizedNames['ZH-TW'].includes(blurItem) || item.LocalizedNames['EN-US'].toLowerCase().includes(blurItem))
    }

    if (tier !== String(tierConfig.All)) {
        copyBaseData = copyBaseData.filter(item => item.UniqueName.includes(tier))
    }

    if (enchantment !== String(enchantmentConfig.All)) {
        copyBaseData = copyBaseData.filter(item => item.UniqueName.includes(enchantment))
    }

    generateDetails(copyBaseData)
}

/**
 * 查詢條件 html 生產器
 * 取回基本資料後再渲染畫面上的details物件
 * @param data 篩選後資料--以Albion github 上的 items.json格式傳入
 * @returns 
 */
const generateDetails = async (data: any[]) => {
    // i 控制物品總覽筆數
    let i = 0

    d1ItemContainer.innerHTML = ''

    if (data.length === 0) {
        d1ItemContainer.innerHTML = '查無結果'

        return
    } 

    for (const item of data) {

        const itemElement = document.createElement('div')
        const jsonToString = JSON.stringify(item)

        itemElement.setAttribute('class', 'items')
        itemElement.setAttribute('data-row', `${jsonToString}`)

        itemElement.innerHTML = `<img id="${item.Index}" alt="PNG Image">${item.LocalizedNames['ZH-TW']}`

        itemElement.addEventListener('click', transferToItemSelector)

        d1ItemContainer.appendChild(itemElement)

        // 把所有此次要渲染的物品真名組成陣列 (為了給icon 數據處理器的參數用)
        imgItemIDArr.push(item.UniqueName)

        i++

        if (i === maxResultCount) {
            console.log(`超過最大顯示筆數限制${maxResultCount}筆`)
            break
        } 
    }

    imgDealer(imgItemIDArr)
}

/**
 * 選項 html 元素產生器
 */
const selectionGenerator = (selectors: HTMLSelectElement[], configs: any[]) => {

    let selectorBundle: selectorPackage[] = []

    // 打包selector and config
    for (const index in selectors) {
        const selectorPack: selectorPackage = {
            element: selectors[index],
            config: configs[index],
        }

        selectorBundle.push(Object.assign({}, selectorPack))
    }

    for (const item of selectorBundle) {
        for (let [key, value] of Object.entries(item.config)) {

            if (!isNaN(Number(key))) continue
    
            // enchantmentConfig 特殊處理
            if (key.includes('dot')) key = key.substring(3);
    
            item.element.innerHTML += `
    <option value="${value}">${key}</option>`
        }
    }
}

// 查詢條件收集器
const getCondition = () => {
    console.log(tierSelector.value)
    console.log(enchantmentSelector.value)
    console.log(qualitySelector.value)
}

// ---------------------各式Function End------------------------

// ------------------elements 事件註冊區 Begin------------------
filter.addEventListener('click', filterBaseData)
priceQuery.addEventListener('click', trackPrice)
detail1.addEventListener("toggle", test)
tierSelector.addEventListener("change", filterBaseData)
enchantmentSelector.addEventListener("change", filterBaseData)
qualitySelector.addEventListener("change", () => {})
// ------------------elements 事件註冊區 End------------------

/**
 * 渲染器啟動點
 */
const Start = async () => {
    // 取回 albion 全物品 存入續渲染器全域變數
    console.log('baseData包裝 Begin')
    baseData = await baseAPI.getItems(jsonUrl)
                        .then(data => {
                            // 不知道那些沒有語言包的物品是什麼(待查清)
                            const filteredData = data.filter(item => item.LocalizedNames !== null)

                            // 將篩選好的資料copy一份UniqueName進入Src暫存器
                            imgSrcArr = filteredData.map((item) => {
                                const resArr: imgEleWithSrc = {
                                    Index: item.Index,
                                    name: item.UniqueName,
                                    src: '',
                                }
                        
                                return resArr
                              })
                            
                            return filteredData
                        })
    console.log('baseData包裝 Complete')


    // 查詢條件 selectors 渲染
    selectionGenerator(selectorArr, configArr)

    // 執行一空條件篩選全物品渲染到 detail 中
    await generateDetails(baseData)

    // imgDealer().then(data => {
    //     $<HTMLImageElement>('#testimg').attr('src', data)
    // })

    // 關閉遮罩
    overlay.style.display = 'none'
}

/**
 * 在 jQuery 3.0 版本之後，ready 函数被標記為過時，建議使用以下的方式來處理文檔就緒事件
 * 這種簡短的形式與 ready 函数的效果相同，並在文檔完全加載後執行相應的代碼。
 */
$(function() {
    // 在這裡放置當文檔完全加載和解析後執行的代碼
    console.log('Document is ready!');
    // 啟動
    Start()
  });