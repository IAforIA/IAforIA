import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';
import { log } from '../vite.ts';

const upload = multer({ dest: 'uploads/' });

export function buildUploadsRouter() {
  const router = Router();

  router.post('/upload/live-doc', authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const { orderId, tipo, gpsLat, gpsLng } = req.body;

      if (!orderId || !tipo) {
        return res.status(400).json({ error: 'orderId e tipo são obrigatórios' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const liveDoc = await storage.createLiveDoc({
        orderId,
        motoboyId: req.user!.id,
        tipo,
        fileUrl,
        fileName: req.file.originalname,
        gpsLat: gpsLat ? String(gpsLat) : null,
        gpsLng: gpsLng ? String(gpsLng) : null,
      });

      res.json({ message: 'Upload realizado com sucesso', liveDoc, fileUrl });
    } catch (error: any) {
      console.error('💥 Erro no upload:', error);
      res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
    }
  });

  // Upload de documento do cliente (CNPJ/CPF ou licença da empresa)
  router.post('/upload/client-doc', authenticateToken, requireRole('client'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é obrigatório' });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      const updated = await storage.updateClient(req.user!.id, {
        documentFileUrl: fileUrl,
      });
      res.json({ message: 'Documento enviado com sucesso', fileUrl, client: updated });
    } catch (error: any) {
      console.error('💥 Erro no upload de documento do cliente:', error);
      res.status(500).json({ error: error.message || 'Erro ao enviar documento' });
    }
  });

  // Upload de CNH ou comprovante de residência do motoboy
  router.post('/upload/motoboy-doc', authenticateToken, requireRole('motoboy'), upload.single('file'), async (req, res) => {
    try {
      const { tipo } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é obrigatório' });
      }
      if (tipo !== 'license' && tipo !== 'residence') {
        return res.status(400).json({ error: "Campo 'tipo' deve ser 'license' ou 'residence'" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const updatePayload = tipo === 'license'
        ? { licenseUrl: fileUrl }
        : { residenceProofUrl: fileUrl };

      const updated = await storage.updateMotoboy(req.user!.id, updatePayload);
      res.json({ message: 'Documento enviado com sucesso', fileUrl, motoboy: updated });
    } catch (error: any) {
      console.error('💥 Erro no upload de documento do motoboy:', error);
      res.status(500).json({ error: error.message || 'Erro ao enviar documento' });
    }
  });

  return router;
}
