# InvestIA - Dashboard de Investimentos Inteligente

**InvestIA** é uma plataforma moderna e intuitiva para gestão de carteira de investimentos, focada em fornecer insights baseados em inteligência artificial e visualização avançada de dados.

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.0.0-blue)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)

## 🚀 Funcionalidades

- **Dashboard Consolidado**: Visão geral do seu patrimônio, rentabilidade e alocação de ativos.
- **Radar InvestIA**: Análise técnica e fundamentalista de ativos usando IA para identificar oportunidades de compra e venda.
- **Plano de Rebalanceamento**: Sugestões inteligentes para equilibrar sua carteira com filtros por categoria (Ações, FIIs, Stocks, etc.).
- **Pulso Global**: Monitoramento em tempo real de indicadores macroeconômicos (Selic, CDI, IPCA) e índices mundiais.
- **Insights de IA**: Alertas personalizados sobre riscos, concentração de ativos e otimização de estratégia.
- **Importação Simplificada**: Suporte para importação de transações via CSV.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React.js, TypeScript, TailwindCSS.
- **Estado**: Zustando para gerenciamento de estado global.
- **Gráficos**: Recharts para visualizações dinâmicas.
- **Animações**: Framer Motion.
- **Backend (Mock/Proxy)**: Express.js (opcional para fins de desenvolvimento).
- **APIs**: Integração com Brapi.dev para dados de mercado em tempo real.

## 📦 Como Instalar e Rodar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/investia-app.git
   cd investia-app
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base).
   - Adicione seu token da Brapi API:
     ```env
     VITE_BRAPI_TOKEN=seu_token_aqui
     ```

### Rodando o Projeto

Para iniciar o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`.

## 📂 Estrutura do Projeto

```text
src/
├── components/   # Componentes UI reutilizáveis
├── services/     # Lógica de integração com APIs (Market, Macro, IA)
├── store/        # Gerenciamento de estado (Zustand)
├── utils/        # Funções utilitárias
├── views/        # Páginas principais (Dashboard, Radar, Insights, etc.)
└── types/        # Definições de tipos TypeScript
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---
Desenvolvido por [Gleidson Rampinelli](https://github.com/gleidson-rampinelli)
