export interface ITrackerPackAPI {
    trackPrices: (apiUrl: string) => Promise<any[]>,
}

export interface IBaseDataAPI {
    getItems: (gitHubUrl: string) => Promise<any[]>,
    getIcons: (iconUrl: string[]) => Promise<string[]>,
}

declare global {
    interface Window {
        trackerPackAPI: ITrackerPackAPI,
        baseDataAPI: IBaseDataAPI,
    }
}