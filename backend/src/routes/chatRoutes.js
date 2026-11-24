import express from "express";
import { ChatController } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", ChatController.send);

export default router;
