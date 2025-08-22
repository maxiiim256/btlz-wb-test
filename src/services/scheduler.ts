import type { Knex } from "knex";
import { upsertTodayBoxTariffs } from "#services/tariffs.js";
import { updateSheetsWithTariffs } from "#services/sheets.js";

function parseSpreadsheetIds(): string[] {
    const raw = process.env.GOOGLE_SPREADSHEET_IDS ?? "";
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export async function scheduleHourlyJobs(knex: Knex) {
    try {
        await upsertTodayBoxTariffs(knex);
        await updateSheetsWithTariffs(knex, parseSpreadsheetIds());
    } catch (e) {
        console.error("Initial hourly job failed:", e);
    }

    setInterval(async () => {
        try {
            await upsertTodayBoxTariffs(knex);
            await updateSheetsWithTariffs(knex, parseSpreadsheetIds());
        } catch (e) {
            console.error("Scheduled hourly job failed:", e);
        }
    }, 60 * 60 * 1000);
}


