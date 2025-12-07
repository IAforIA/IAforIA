# IMPLEMENTAÇÃO: Upload de Anexos no Chat

## PROBLEMA
- Motoboy não consegue corrigir foto de comprovante se enviar errada
- Chat não suporta envio de arquivos
- Impossível enviar fotos complementares ou documentos

## SOLUÇÃO
Adicionar suporte a anexos (fotos, PDFs) no chat entre Cliente/Motoboy ↔ Central

## MUDANÇAS NECESSÁRIAS

### 1. ✅ BANCO DE DADOS (Concluído)
- Schema: Adicionados `attachmentUrl` e `attachmentType` em `chatMessages`
- Migration: `migrations/add-chat-attachments.sql` criada

### 2. ⏳ BACKEND (A fazer)

#### A. Rota de Upload de Arquivo
**Arquivo:** `server/routes.ts`

```typescript
// POST /api/chat/upload - Upload de arquivo para chat
router.post("/api/chat/upload", 
  authenticateToken, 
  upload.single('file'),  // Multer middleware
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    
    // Retorna URL do arquivo salvo
    const fileUrl = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;
    
    res.json({ 
      url: fileUrl, 
      type: mimeType,
      size: req.file.size 
    });
  }
);
```

#### B. Modificar POST /api/chat para aceitar attachmentUrl
**Arquivo:** `server/routes.ts` (linha ~1141)

Adicionar campos opcionais:
```typescript
const { message, category, orderId, threadId, toId, toRole, attachmentUrl, attachmentType } = req.body;
```

Incluir no INSERT:
```typescript
await db.insert(chatMessages).values({
  // ... campos existentes
  message: message || '',  // Permitir mensagem vazia se tiver anexo
  attachmentUrl,
  attachmentType,
  // ...
});
```

### 3. ⏳ FRONTEND (A fazer)

#### A. Componente de Upload
**Arquivo:** `client/src/components/ChatFileUpload.tsx` (NOVO)

Funcionalidades:
- Botão com ícone de clipe (📎)
- Input file com `accept="image/*,application/pdf"`
- Atributo `capture="environment"` para abrir câmera em mobile
- Preview de imagem antes de enviar
- Progress bar durante upload
- Validação de tamanho (máx 5MB)

#### B. Modificar ChatWidget
**Arquivo:** `client/src/components/ChatWidget.tsx`

Mudanças:
1. Estado para arquivo selecionado:
```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
```

2. Função de upload:
```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('/api/chat/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  return await res.json(); // { url, type, size }
};
```

3. Modificar handleSend para incluir anexo:
```typescript
const handleSend = async () => {
  let attachmentUrl, attachmentType;
  
  if (selectedFile) {
    const uploadRes = await uploadFile(selectedFile);
    attachmentUrl = uploadRes.url;
    attachmentType = uploadRes.type;
  }
  
  sendMutation.mutate({
    // ...
    attachmentUrl,
    attachmentType
  });
  
  // Limpar preview
  setSelectedFile(null);
  setPreviewUrl(null);
};
```

4. UI no input de mensagem:
```tsx
<div className="relative">
  {previewUrl && (
    <div className="mb-2 relative inline-block">
      <img src={previewUrl} className="max-h-20 rounded" />
      <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )}
  
  <div className="flex gap-2">
    <label className="cursor-pointer">
      <Paperclip className="h-5 w-5" />
      <input 
        type="file" 
        accept="image/*,application/pdf"
        capture="environment"  // Abre câmera no mobile
        onChange={handleFileSelect}
        className="hidden"
      />
    </label>
    <Input value={message} onChange={...} />
    <Button onClick={handleSend}>Enviar</Button>
  </div>
</div>
```

#### C. Exibir Anexos nas Mensagens
**Arquivo:** `client/src/components/ChatMessage.tsx`

Adicionar:
```tsx
{msg.attachmentUrl && (
  <div className="mt-2">
    {msg.attachmentType?.startsWith('image/') ? (
      <a href={msg.attachmentUrl} target="_blank">
        <img 
          src={msg.attachmentUrl} 
          className="max-w-full rounded border cursor-pointer hover:opacity-80"
          style={{ maxHeight: '200px' }}
        />
      </a>
    ) : (
      <a href={msg.attachmentUrl} target="_blank" className="flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        <span>Arquivo anexado</span>
      </a>
    )}
  </div>
)}
```

### 4. ⏳ MIGRAÇÃO DO BANCO (A fazer)

Executar no servidor SSH:
```bash
cd /var/www/guriri-express
psql $DATABASE_URL -f migrations/add-chat-attachments.sql
```

Ou criar script Node.js para executar automaticamente.

## FLUXO DE USO

### Cenário 1: Motoboy envia foto errada no Live Docs
1. Motoboy abre chat com Central
2. Categoria: "Reportar Problema"
3. Mensagem: "Enviei foto errada do pedido #123"
4. Clica em 📎 → Escolhe "Câmera" → Tira foto correta
5. Preview aparece → Clica "Enviar"
6. Central recebe mensagem com anexo
7. Central pode baixar e substituir manualmente no sistema

### Cenário 2: Cliente precisa enviar nota fiscal
1. Cliente abre chat com Central
2. Categoria: "Falar com Central"
3. Mensagem: "Segue NF do pedido"
4. Clica em 📎 → Escolhe arquivo PDF
5. Envia para Central
6. Central processa documento

## SEGURANÇA

- Upload limitado a: image/*, application/pdf
- Tamanho máximo: 5MB
- Validação de MIME type no backend
- Arquivos salvos em `/uploads/chat/` (separado de live-docs)
- Nome de arquivo: `chat-{userId}-{timestamp}.{ext}`

## MELHORIAS FUTURAS

- Comprimir imagens antes de upload (client-side)
- Suporte a múltiplos anexos por mensagem
- Galeria de anexos na visualização do pedido
- Notificação push quando anexo é enviado

## PRONTO PARA IMPLEMENTAR?

Confirme se aprova esta arquitetura antes de eu gerar o código completo.
