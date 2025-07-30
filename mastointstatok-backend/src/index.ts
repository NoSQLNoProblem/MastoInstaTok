import app from "./app.js";
import "./logging.js";

app.listen(5000, () => {
  console.log("Server started at http://localhost:5000");
});
