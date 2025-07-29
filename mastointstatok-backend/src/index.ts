import app from "./app.ts";
import "./logging.ts";

app.listen(3000, () => {
  console.log("Server started at http://localhost:3000");
});
