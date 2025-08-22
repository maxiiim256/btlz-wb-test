import { google } from "googleapis";
import type { JWTInput } from "google-auth-library";
import type { Knex } from "knex";
import { readLatestBoxTariffs } from "#services/tariffs.js";

function buildJwtFromEnv(env: NodeJS.ProcessEnv): JWTInput {
    const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    return {
        project_id: env.GOOGLE_PROJECT_ID,
        client_email: env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
    } as JWTInput;
}

export async function updateSheetsWithTariffs(knex: Knex, spreadsheetIds: string[]): Promise<void> {
    if (spreadsheetIds.length === 0) return;

    const jwt = buildJwtFromEnv(process.env);
    const auth = new google.auth.GoogleAuth({
        credentials: jwt,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const data = await readLatestBoxTariffs(knex);
    if (!data || !Array.isArray(data)) return;

    const rows: (string | number)[][] = [[
        "Склад",
        "Базовая доставка",
        "Доставка за литр",
        "Базовое хранение",
        "Хранение за литр",
        "Коэффициент",
    ]];

    const warehouses: Array<{
        name: string;
        deliveryBase: number;
        deliveryLiter: number;
        storageBase: number;
        storageLiter: number;
        coefficient: number;
    }> = [];

    for (const tariff of data as any[]) {
        if (tariff?.warehouseList && Array.isArray(tariff.warehouseList)) {
            for (const warehouse of tariff.warehouseList) {
                const coefficient = (warehouse.boxDeliveryBase || 0) + (warehouse.boxStorageBase || 0);
                warehouses.push({
                    name: warehouse.warehouseName || "Unknown",
                    deliveryBase: warehouse.boxDeliveryBase || 0,
                    deliveryLiter: warehouse.boxDeliveryLiter || 0,
                    storageBase: warehouse.boxStorageBase || 0,
                    storageLiter: warehouse.boxStorageLiter || 0,
                    coefficient,
                });
            }
        }
    }

    warehouses.sort((a, b) => a.coefficient - b.coefficient);
    for (const w of warehouses) {
        rows.push([w.name, w.deliveryBase, w.deliveryLiter, w.storageBase, w.storageLiter, w.coefficient]);
    }

    await Promise.all(
        spreadsheetIds.map(async (spreadsheetId) => {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: "stocks_coefs!A1",
                valueInputOption: "RAW",
                requestBody: { values: rows },
            });
        }),
    );
}


