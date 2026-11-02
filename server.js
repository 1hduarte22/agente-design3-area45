// ⚠️ SEMPRE a primeira linha — carrega o .env antes de tudo
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ========== CONFIGURAÇÕES (lidas do .env) ==========
const AGENT_ID = process.env.AGENT_ID;
const API_KEY  = process.env.API_KEY;
const PORT     = process.env.PORT || 3000;
const API_BASE = `https://app.base44.com/api/agents/${AGENT_ID}`;

// Valida se as variáveis foram carregadas corretamente
if (!AGENT_ID || !API_KEY) {
    console.error('❌ ERRO: Variáveis de ambiente não encontradas!');
    console.error('   Certifique-se de que o arquivo .env existe na raiz do projeto.');
    console.error('   Copie o .env.example para .env e preencha com suas chaves.');
    process.exit(1);
}

// AUMENTANDO TIMEOUT para 2 minutos (agente pode demorar para gerar imagem)
const axiosIA = axios.create({ timeout: 120000 }); // 2 minutos

// ========== BANCO DE HASHTAGS VIRAIS ==========
const VIRAL_HASHTAGS_DB = {
    tecnologia: ['#TechBR', '#Inovação', '#IA', '#Programação', '#DevLife', '#StartupBrasil'],
    marketing: ['#MarketingDigital', '#SocialMedia', '#ConteúdoQueVende', '#GrowthHacking', '#SEO2026'],
    design: ['#DesignGráfico', '#UIUX', '#Criatividade', '#Figma', '#DesignBrasil', '#ArteDigital'],
    saude: ['#SaúdeBemEstar', '#VidaSaudável', '#FitnessBrasil', '#MentalHealthMatters'],
    educacao: ['#EducaçãoInovadora', '#AprendizadoContínuo', '#EAD', '#CursosOnline'],
    negocios: ['#Empreendedorismo', '#Gestão', '#StartupBR', '#Networking', '#InovaçãoNosNegócios'],
    brasil: ['#BrasilViral', '#TendênciasBR', '#FocoNoBrasil', '#ConteúdoBrasileiro']
};

function gerarHashtagsPorTema(topic) {
    const hashtagsGeradas = new Set();
    const topicLower = topic.toLowerCase();
    
    for (const [categoria, tags] of Object.entries(VIRAL_HASHTAGS_DB)) {
        if (topicLower.includes(categoria)) {
            tags.slice(0, 4).forEach(tag => hashtagsGeradas.add(tag));
        }
    }
    
    const palavrasChave = topic.match(/\b[A-Za-zÀ-ÖØ-öø-ÿ]{4,}\b/g) || [];
    const principaisPalavras = palavrasChave.slice(0, 4);
    
    principaisPalavras.forEach(palavra => {
        const clean = palavra.toLowerCase();
        hashtagsGeradas.add('#' + clean);
        hashtagsGeradas.add('#' + clean + 'Brasil');
    });
    
    const momentHashtags = [
        '#ViralDoMomento', '#TáNaModa', '#TendênciaHoje', 
        '#ConteúdoQueConecta', '#RedesSociais', '#PostDoDia'
    ];
    
    momentHashtags.sort(() => 0.5 - Math.random()).slice(0, 4).forEach(tag => hashtagsGeradas.add(tag));
    hashtagsGeradas.add('#Brasil');
    
    return [...hashtagsGeradas].slice(0, 15);
}

// ========== FUNÇÃO PARA AGUARDAR RESPOSTA DO AGENTE (COM POLLING) ==========
async function aguardarRespostaDoAgente(conversationId, maxTentativas = 15, intervaloMs = 3000) {
    console.log(`[polling] Aguardando resposta do agente (max ${maxTentativas} tentativas)...`);
    
    for (let i = 0; i < maxTentativas; i++) {
        try {
            await new Promise(resolve => setTimeout(resolve, intervaloMs));
            
            const response = await axiosIA.get(
                `${API_BASE}/conversations/${conversationId}`,
                { headers: { 'api_key': API_KEY } }
            );
            
            const messages = response.data?.messages || [];
            const assistantMessages = messages.filter(m => m.role === 'assistant');
            
            if (assistantMessages.length > 0) {
                const lastAssistant = assistantMessages[assistantMessages.length - 1];
                console.log(`[polling] ✅ Resposta recebida na tentativa ${i + 1}!`);
                return lastAssistant;
            }
            
            console.log(`[polling] Tentativa ${i + 1}/${maxTentativas} - aguardando...`);
            
        } catch (e) {
            console.warn(`[polling] Erro na tentativa ${i + 1}:`, e.message);
        }
    }
    
    console.log(`[polling] ⚠️ Tempo esgotado após ${maxTentativas} tentativas`);
    return null;
}

// ========== ROTA CRIAR CONVERSA ==========
app.post('/api/conversations', async (req, res) => {
    console.log('\n📞 Criando nova conversa...');
    
    try {
        const response = await axiosIA.post(
            `${API_BASE}/conversations`,
            {},
            { headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' } }
        );
        
        console.log('✅ Conversa criada:', response.data.id);
        res.json(response.data);
        
    } catch (e) {
        console.error('❌ Erro:', e.message);
        res.status(e.response?.status || 500).json({ 
            error: e.response?.data?.message || e.message 
        });
    }
});

// ========== ROTA ENVIAR MENSAGEM (COM POLLING) ==========
app.post('/api/messages', async (req, res) => {
    const { conversationId, content } = req.body;
    
    console.log('\n💬 Nova mensagem:');
    console.log(`   Conversation: ${conversationId}`);
    console.log(`   Conteúdo: ${content?.substring(0, 80)}...`);
    
    if (!conversationId || !content) {
        return res.status(400).json({ error: 'conversationId e content são obrigatórios.' });
    }
    
    try {
        console.log('[1/3] Enviando mensagem para o agente...');
        
        await axiosIA.post(
            `${API_BASE}/conversations/${conversationId}/messages`,
            { role: "user", content },
            { headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' } }
        );
        
        console.log('[2/3] Mensagem enviada, aguardando resposta do agente...');
        
        const resposta = await aguardarRespostaDoAgente(conversationId, 20, 3000);
        
        if (!resposta) {
            throw new Error('Tempo esgotado aguardando resposta do agente');
        }
        
        console.log('[3/3] Resposta recebida!');
        console.log(`   Tem imagens: ${resposta.file_urls?.length || 0}`);
        
        const hashtags = gerarHashtagsPorTema(content);
        
        const mensagemHashtags = `🏷️ **Hashtags em tendência para seu post (${hashtags.length} tags):**\n\n${hashtags.join('  ·  ')}\n\n💡 **Dica:** Use estas hashtags nos primeiros comentários para máximo alcance!`;
        
        res.json({
            messages: [
                {
                    role: 'assistant',
                    content: resposta.content || '✨ Banner gerado com sucesso!',
                    file_urls: resposta.file_urls || [],
                    type: 'banner'
                },
                {
                    role: 'assistant',
                    content: mensagemHashtags,
                    file_urls: [],
                    type: 'hashtags'
                }
            ]
        });
        
    } catch (e) {
        console.error('❌ ERRO:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ========== ROTA SALVAR IMAGEM ==========
app.post('/api/save-image', async (req, res) => {
    const { imageUrl, platform } = req.body;
    
    if (!imageUrl || !platform) {
        return res.status(400).json({ error: 'Faltam dados.' });
    }
    
    const platformDir = path.join(process.cwd(), 'output', platform.toLowerCase());
    
    try {
        if (!fs.existsSync(platformDir)) {
            fs.mkdirSync(platformDir, { recursive: true });
        }
        
        const parsedUrl = new URL(imageUrl);
        const ext = path.extname(parsedUrl.pathname) || '.png';
        const fileName = `image_${Date.now()}${ext}`;
        const filePath = path.join(platformDir, fileName);
        const proto = imageUrl.startsWith('https') ? https : http;
        
        console.log(`💾 Salvando imagem: ${fileName}`);
        
        await new Promise((resolve, reject) => {
            const request = proto.get(imageUrl, { timeout: 30000 }, response => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`HTTP ${response.statusCode}`));
                }
                const ws = fs.createWriteStream(filePath);
                response.pipe(ws);
                ws.on('finish', () => { ws.close(); resolve(); });
                ws.on('error', reject);
            });
            request.on('error', reject);
            request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
        });
        
        console.log(`✅ Imagem salva: ${filePath}`);
        res.json({ success: true, filePath, fileName });
        
    } catch (err) {
        console.error('❌ Erro ao salvar imagem:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTA BUSCAR CONVERSA ==========
app.get('/api/conversations/:id', async (req, res) => {
    try {
        const response = await axiosIA.get(
            `${API_BASE}/conversations/${req.params.id}`,
            { headers: { 'api_key': API_KEY } }
        );
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.message });
    }
});

// ========== ROTA DE DIAGNÓSTICO ==========
app.get('/api/diagnostico', async (req, res) => {
    res.json({
        status: 'online',
        agent_id: AGENT_ID,
        // Mostra apenas os 8 primeiros caracteres — nunca a chave completa
        api_key_prefix: API_KEY.substring(0, 8) + '...',
        endpoints: {
            conversations: `${API_BASE}/conversations`
        },
        instrucoes: 'Use POST /api/conversations para criar conversa, depois POST /api/messages para enviar mensagem'
    });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('✅ SERVIDOR FUNCIONANDO!');
    console.log('========================================');
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🤖 Agente ID: ${AGENT_ID}`);
    console.log(`⏱️  Timeout: 2 minutos (para geração de imagens)`);
    console.log(`🔄 Polling: 20 tentativas a cada 3 segundos`);
    console.log('========================================\n');
});