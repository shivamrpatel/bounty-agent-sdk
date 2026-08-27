import { Hono } from "hono";

import { channel as bounty } from "./channels/bounty.js";

const app = new Hono();
app.route("/channels/bounty", bounty.route());

export default app;
