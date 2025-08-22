import knex, { migrate, seed } from "#postgres/knex.js";
import { scheduleHourlyJobs } from "#services/scheduler.js";

await migrate.latest();
await seed.run();

console.log("All migrations and seeds have been run");

// Запускаем планировщик фоновых задач
await scheduleHourlyJobs(knex);