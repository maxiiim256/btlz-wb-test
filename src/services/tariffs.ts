import type { Knex } from "knex";
import { fetchWbBoxTariffs, type WbBoxTariffsResponse } from "#services/wb.js";

function getTodayDateStr(): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export async function upsertTodayBoxTariffs(knex: Knex): Promise<{ updated: boolean }> {
    const day = getTodayDateStr();
    const payload: WbBoxTariffsResponse = await fetchWbBoxTariffs();
    const row = {
        day,
        data: JSON.stringify(payload),
        updated_at: knex.fn.now(),
    } as const;

    await knex("tariffs_box_daily")
        .insert(row)
        .onConflict(["day"]) // day is primary
        .merge({ data: row.data, updated_at: row.updated_at });

    return { updated: true };
}

export async function readLatestBoxTariffs(knex: Knex): Promise<WbBoxTariffsResponse | null> {
    const rec = await knex("tariffs_box_daily").orderBy("day", "desc").first();
    if (!rec) return null;
    try {
        return typeof rec.data === "string" ? JSON.parse(rec.data) : rec.data;
    } catch {
        return null;
    }
}


