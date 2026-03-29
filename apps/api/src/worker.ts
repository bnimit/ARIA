/**
 * Worker entry point — starts BullMQ workers WITHOUT the HTTP server.
 *
 * Use this process for background job processing:
 *   bun run worker
 *
 * The HTTP server and this worker can run as separate processes (recommended
 * for production) or the server can also start workers via startWorkers().
 */

import { scraperWorker } from "./workers/scraper.worker.js";
import { analyzerWorker } from "./workers/analyzer.worker.js";

console.log("Starting Reddit Intelligence workers...");
console.log(`  [scraper.worker]  listening on queue: scrape`);
console.log(`  [analyzer.worker] listening on queue: analyze`);

// Keep the process alive
process.on("SIGINT", async () => {
  console.log("\nShutting down workers...");
  await scraperWorker.close();
  await analyzerWorker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down workers...");
  await scraperWorker.close();
  await analyzerWorker.close();
  process.exit(0);
});

export { scraperWorker, analyzerWorker };
