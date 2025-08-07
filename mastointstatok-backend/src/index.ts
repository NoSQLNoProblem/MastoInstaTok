import { getLogger } from "@logtape/logtape";
import app from "./app.js";

app.listen(5000, () => {
  getLogger().debug("Server started at http://localhost:5000");
});
