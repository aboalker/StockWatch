import { setBaseUrl } from "@workspace/api-client-react";

const base = import.meta.env.BASE_URL?.replace(/\/+$/, "") ?? "";
setBaseUrl(base || null);
