# Falae.dev - Client

Frontend da plataforma **Falae.dev**, uma comunidade para compartilhamento de artigos e discussões técnicas.

## Tecnologias

- **Nuxt 4** - Framework Vue.js com SSR
- **Vue 3** - Framework reativo
- **TailwindCSS** - Estilização utilitária
- **Tiptap** - Editor de texto rico
- **KaTeX** - Renderização de fórmulas LaTeX
- **Mermaid** - Diagramas e fluxogramas
- **Lowlight** - Syntax highlighting para código

## Funcionalidades

- Publicação de artigos e tópicos
- Editor WYSIWYG com suporte a Markdown, código, LaTeX e diagramas
- Sistema de comentários
- Autenticação (Google + email/senha)
- Perfis de usuário
- Busca de conteúdo

## Rodando Localmente

### Pré-requisitos

- Node.js 18+
- npm (ou pnpm/yarn/bun)

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

### Build de Produção

```bash
npm run build
```

### Preview do Build

```bash
npm run preview
```

## Configuração

Variáveis de ambiente (opcional):

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NUXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID do Google OAuth | - |

## Estrutura do Projeto

```
app/
├── components/     # Componentes Vue reutilizáveis
├── composables/    # Composables (lógica compartilhada)
├── extensions/     # Extensões do Tiptap (LaTeX, Mermaid)
├── layouts/        # Layouts da aplicação
├── pages/          # Páginas/rotas
└── utils/          # Funções utilitárias
```
