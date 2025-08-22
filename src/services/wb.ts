import { setTimeout as delay } from "timers/promises";

const WB_BOX_TARIFFS_URL = "https://common-api.wildberries.ru/api/v1/tariffs/box";

export type WbBoxTariff = {
    dtNextBox: string;
    dtTillMax: string;
    warehouseList: Array<{
        boxDeliveryAndStorageExpr: string;
        boxDeliveryBase: number;
        boxDeliveryLiter: number;
        boxStorageBase: number;
        boxStorageLiter: number;
        warehouseName: string;
    }>;
};

export type WbBoxTariffsResponse = WbBoxTariff[];

export async function fetchWbBoxTariffs(retryCount = 2): Promise<WbBoxTariffsResponse> {
    const apiKey = process.env.WB_API_KEY;
    if (!apiKey) {
        throw new Error("WB_API_KEY is required but not provided");
    }

    // Добавляем параметр date (текущая дата)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `${WB_BOX_TARIFFS_URL}?date=${today}`;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    Authorization: apiKey,
                },
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`WB API error ${res.status}:`, errorText);
                throw new Error(`WB API responded with status ${res.status}: ${errorText}`);
            }
            return (await res.json()) as WbBoxTariffsResponse;
        } catch (error) {
            if (attempt === retryCount) throw error;
            await delay(200 * (attempt + 1));
        }
    }
    throw new Error("Unreachable");
}


