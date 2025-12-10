import express from 'express';
import upload from '../middleware/upload.js';
import { subirFoto } from '../controllers/fotosController.js';

const router = express.Router();

router.post('/upload', upload.single('imagen'), subirFoto);

export default router;
