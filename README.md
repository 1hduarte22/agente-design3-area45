# Lê — Agente de Design com IA 🎨

> Gere banners prontos para redes sociais + hashtags em tendência a partir de um briefing em linguagem natural.

---

## O que é este projeto?

**Lê** é uma aplicação web de chat que conecta o usuário a um agente de IA especializado em design, construído na plataforma **Base44**. O usuário descreve o que quer — o estilo, o tema, a plataforma — e o agente gera um banner pronto para postar, junto com hashtags selecionadas automaticamente pelo tema do conteúdo.

O projeto nasceu da necessidade de agilizar a criação de conteúdo visual para redes sociais sem depender de ferramentas complexas de design. Com a Lê, o processo vai de briefing a imagem em menos de dois minutos.

---

## Como funciona

O fluxo completo acontece assim:

1. O usuário abre o chat e digita o briefing (ex: *"Crie um banner de Black Friday com fundo escuro para uma loja de tech"*)
2. O frontend envia a mensagem para o backend em Node.js
3. O backend repassa para o **agente da Base44** via API REST
4. O agente processa e gera a imagem — como o processo pode levar alguns segundos, o backend usa um sistema de **polling** que consulta a resposta a cada 3 segundos por até 1 minuto
5. Quando a imagem chega, o backend também gera **hashtags automáticas** por tema e retorna tudo junto para o frontend
6. O usuário vê o banner na tela e pode salvar localmente com um clique

---

## Funcionalidades

**Chat com agente de IA**
Interface de conversa fluida com histórico de mensagens, múltiplas conversas simultâneas e indicador de digitação animado enquanto o banner é gerado.

**Geração de banners**
O agente da Base44 interpreta o briefing e cria a imagem com composição, paleta de cores e tipografia adequadas à plataforma solicitada.

**Hashtags automáticas por tema**
O sistema analisa o briefing, identifica o nicho (tecnologia, moda, saúde, negócios, etc.) e monta um conjunto de até 15 hashtags relevantes. Cada hashtag é clicável — um clique copia direto para a área de transferência. Há também um botão para copiar todas de uma vez.

**Salvamento de imagem com caminho exibido**
O botão "Salvar imagem" baixa o banner gerado e organiza em pastas por plataforma (ex: `output/instagram/`). O caminho completo do arquivo salvo é exibido no próprio chat.

**Prompts recomendados**
Um painel lateral com 6 briefings prontos e testados — o usuário clica e o texto já vai direto para o campo de mensagem, sem precisar digitar nada.

**Guia de melhores horários para postar**
Modal com os horários de maior engajamento em cada rede social (Instagram, TikTok, Facebook, LinkedIn, Pinterest e X), com base no fuso de Brasília.

---

## Rotas da API (backend)

| Método | Rota | O que faz |
|--------|------|-----------|
| `POST` | `/api/conversations` | Cria uma nova conversa no agente |
| `POST` | `/api/messages` | Envia o briefing e retorna banner + hashtags |
| `GET` | `/api/conversations/:id` | Busca o histórico de uma conversa |
| `POST` | `/api/save-image` | Baixa e salva a imagem gerada localmente |
| `GET` | `/api/diagnostico` | Verifica se o servidor está online |

---

## Tecnologias utilizadas

- **Frontend:** HTML, CSS e JavaScript puro — sem frameworks
- **Backend:** Node.js com Express
- **Agente de IA:** [Base44](https://base44.com) — plataforma de criação de agentes de IA
- **HTTP Client:** Axios com timeout de 2 minutos para suportar a geração de imagens
- **Segurança:** Variáveis de ambiente via dotenv — nenhuma chave exposta no código

---

## Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/agente-le-design.git
cd agente-le-design

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Abra o .env e preencha com suas chaves da Base44

# 4. Inicie o servidor
node server.js

# 5. Abra o index.html no navegador
```

---

## Estrutura de arquivos

```
/
├── index.html        # Interface do chat
├── styles.css        # Estilização
├── server.js         # Backend Node.js + rotas da API
├── .env              # Suas chaves (NÃO sobe para o GitHub)
├── .env.example      # Modelo das variáveis necessárias
├── .gitignore        # Protege o .env e node_modules
└── output/           # Imagens salvas, organizadas por plataforma
    ├── instagram/
    ├── tiktok/
    └── linkedin/
```

---

## Sobre o agente da Base44

O coração do projeto é um agente criado na plataforma **Base44**, que interpreta briefings em linguagem natural e gera imagens com qualidade de design. A Base44 permite construir agentes de IA conectados a diferentes capacidades — neste caso, geração de conteúdo visual — sem precisar treinar modelos do zero.

A comunicação entre o backend e o agente acontece via API REST com autenticação por chave. Como a geração de imagem pode levar entre 10 e 40 segundos, o backend implementa um mecanismo de polling que aguarda a resposta sem travar a requisição do usuário.

---

## Aprendizados do projeto

- Integração com APIs de agentes de IA externos
- Polling assíncrono para operações de longa duração
- Arquitetura simples de backend proxy para proteger credenciais
- Construção de interface de chat do zero com HTML/CSS/JS
- Boas práticas de segurança com variáveis de ambiente

---

*Projeto desenvolvido com foco em criadores de conteúdo que precisam de velocidade na produção visual sem abrir mão da qualidade.*
