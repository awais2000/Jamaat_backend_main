import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./config/db"; 
import userRoutes from "./routes/userRoutes";

const app: Application = express();
const PORT: number = 3001;

dotenv.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(bodyParser.json());

// Middleware
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running!");
});

pool
  .getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database.");
    connection.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

userRoutes(app);

app.listen(PORT, () => {
  console.log(` Server running on port:${PORT}`);
});
