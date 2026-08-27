import { defineExtension } from "eve/extension";
import { z } from "zod";

export default defineExtension({
  config: z.object({
    apiKey: z.string().min(1),
    webhookSecret: z.union([
      z.string().min(1),
      z.array(z.string().min(1)).min(1),
    ]),
    baseURL: z.string().url().default("https://api.trybounty.ai"),
  }),
});
