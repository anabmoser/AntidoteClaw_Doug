# Documentação: Video Specialist (@video editor) 🎬

Este documento detalha o funcionamento, ferramentas, capacidades e estilizações técnicas configuradas no **Especialista de Vídeo do Doug (GravityClaw)**.

## 🚀 O que ele faz?
O Video Specialist é um agente autônomo que gerencia um **pipeline completo e interativo** de edição de vídeo, operando diretamente pelo **Telegram**. 
Foi projetado visando escalabilidade e facilidade de revisão, integrando bibliotecas avançadas de processamento em Node.js com inteligência LLM.

---

## ⚙️ Principais Features

### 1. Ingestão e Download Autônomo
- Quando o usuário envia um arquivo de mídia pelo Telegram contendo chamados (como *editar vídeo*, *decupagem*, *cortar*, etc.), o bot baixa esse vídeo localmente `.mp4` do Telegram para o servidor/sandbox no diretório `.tmp/video`.

### 2. Transcrição IA Avançada (AssemblyAI)
- O vídeo é transferido para a API do **AssemblyAI**.
- Ele faz a transcrição com a opção `speaker_labels=true` (Diário de locutor), dividindo exatamente quem falou e quando o áudio foi detectado.
- *Fallback Model*: Caso o modelo "universal-3-pro" não retorne áudio, o sistema automaticamente tenta com a versão "universal-2".

### 3. Decupagem Inteligente (Gemini 3.1 Pro)
- A transcrição textual gerada é enviada direto para o roteador LLM do Doug (com o modelo Gemini).
- O Gemini é instruído via prompt (e alimentado com instruções da Ana Moser — foco em esporte e educação) para:
  1. Encontrar de 1 a 5 trechos virais ideais para TikTok/Reels.
  2. Determinar o `start` e `end` absolutos (em `HH:MM:SS`) de cada corte.
  3. Gerar um **Header/Título Chamativo** para o corte.
  4. Extrair e reescrever as **Legendas** com base nas falas mapeadas para aquele momento, calculando o *timestamp relativo* de cada frase para encaixar perfeitamente naquele clip.

### 4. Modo "Sessão Interativa" (Aprovação e Feedback)
- Diferente de outros geradores de um clique, o Doug é configurado para travar uma **Sessão Pendente**. 
- Ele exibe no chat a Transcrição Completa e os Cortes Sugeridos em formato de resumo tático.
- O usuário está no controle completo. Você pode enviar um feedback: *"No Corte 1, tire a segunda frase, por favor."*
- O Gemini reprocessa o feedback sobre a JSON structure guardada em memória, refaz os cortes e espera você mandar *"Pode gerar aprovado!"*.

### 5. Motor Visual: FFmpeg-Static
- Ao invadir o fluxo de geração, usamos o pacote binário `ffmpeg-static` via processo Child (`execFile`). 
- **Sem servidor externo de edição**: Cortar, aplicar efeitos de fonte, colorir o vídeo, codificação x264 de vídeo/áudio e multiplexagem são todos feitos em processamento local nativo rápido.

---

## 🎨 Estilizações do FFmpeg Configuradas (Overlay Visual)

Durante a geração em bloco, o bot injeta *filtros dinâmicos* para criar o layout gráfico por cima do vídeo:

### 📌 Header (Título Fixo Superior)
- Aparece o vídeo todo em cima (útil para ancorar a atenção).
- **Comando Drawbox:** Fundo de opacidade/translucidez (`drawbox=x=0:y=0:w=iw:h=50:color=black@0.7:t=fill`)
- **Box Preta:** H=50px, pegando 100% da largura, Preenchimento Sólido c/ 70% de Opacidade.
- **Tipografia:** `fontsize=24`
- **Cor:** `fontcolor=white`
- **Posição:** Centralizado na Box `x=(w-text_w)/2`, `y=15`

### 💬 Legendas (Subtitles Overlays Dinâmicas)
O vídeo não queima a legenda toda junta! Ele roda linha a linha através da extração das frases baseadas no `t` (frames/tempos) do FFmpeg.
- **Algoritmo Quebra de Linha:** Textos grandes são quebrados automaticamente a cada 35 caracteres para criar multi-linhas.
- **Tipografia:** `fontsize=20`
- **Cor:** `fontcolor=white`
- **Borda/Contorno Elevado (Legibilidade em fundo claro):** `borderw=2`, `bordercolor=black`
- **Posicionamento Empilhado:** As frases descem de baixo para cima `h-60`, `h-90` criando a escadinha típica de legendas de Shorts em vídeos verticais (Y).

---

## ☁️ Armazenamento Cloud e Clean Up (Relatório Drive)

Ao fim do processo visual `node.js` executa dois fechamentos logísticos importantes:

1. **Upload Múltiplo pro Google Drive**: Puxa seus uploads para a pasta `Doug` -> `/Outputs - Videos` identificando recortes gerados.
2. **Relatório**: O Google Drive reccebe o `decupagem-[Data].txt`, que guarda a transcrição inteira e todas as propostas da IA como arquivo histórico/matéria bruta.
3. **Clean Storage**: Executa varredura de exclusão `unlinkSync()` limpando os vídeos temporários locais para gerir memória com inteligência.

---
_Aproveite o fluxo de criação turbinado do seu Content Engine_ 🦾
