import app from "./app.ts";
import "./logging.ts";

app.listen(5000, () => {
  console.log("Server started at http://localhost:5000");
});
