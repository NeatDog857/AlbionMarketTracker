export interface ItrackerPackAPI {
    trackPrices: (apiUrl: string) => Promise<any[]>,
}

export interface IBaseDataAPI {
    getItems: (gitHubUrl: string) => Promise<any[]>,
    getIcons: (iconUrl: string[]) => Promise<string[]>,
}

declare global {
    interface Window {
        trackerPackAPI: ItrackerPackAPI,
        baseDataAPI: IBaseDataAPI,
    }
}