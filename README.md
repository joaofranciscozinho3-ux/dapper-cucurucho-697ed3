# Elaine — Faça. Registre. Compartilhe.

Elaine é um aplicativo web mobile, público e multiusuário, que transforma intenção em ação prática
compartilhada. Cada participante realiza algo concreto, registra uma evidência (foto, texto ou os dois)
e publica em um **feed público único**, visto por todo mundo que abre o mesmo link.

## Funcionalidades

- **Identidade anônima persistente, sem login** — na primeira abertura o app pergunta
  “Como você quer aparecer no Elaine?”. Depois disso o dispositivo é reconhecido automaticamente
  (cookie HttpOnly de longa duração + cópia em `localStorage`). Nunca usa o IP como identidade.
- **Chave de recuperação personalizada** — a própria pessoa cria uma frase fácil de lembrar
  (ex.: “tatu azul na praia”) ao entrar, e pode trocá-la em “Meu perfil”. Com ela volta à mesma
  identidade após limpar o navegador ou em outro aparelho, sem desconectar os demais. Maiúsculas,
  acentos e separadores não importam; a chave é guardada só como hash (scrypt).
- **Feed público compartilhado** lido do banco de dados, com paginação e atualização ao voltar ao app.
- **Registrar uma ação** com câmera real (getUserMedia, com alternativa pela câmera do sistema),
  galeria, pré-visualização, compressão no cliente e barra de progresso de upload.
- **Comentários** reais, salvos no servidor.
- **Exclusão das próprias publicações**, validada no backend (inclui imagem e comentários).
- **Perfil** com nome, número de ações e lista das próprias ações; troca de nome sem criar nova identidade.
- Estados de carregamento, vazio, erro, sem conexão e permissão de câmera negada.

## Tecnologias

- TanStack Start (React 19, TanStack Router) + Vite + Tailwind CSS 4
- Rotas de servidor do TanStack Start como API (`src/routes/api/*`)
- **Netlify Database** (Postgres gerenciado) com Drizzle ORM — participantes, publicações, comentários, rate limiting
- **Netlify Blobs** — armazenamento das fotos
- Deploy na Netlify

## Rodando localmente

```bash
pnpm install
netlify dev
```

O `netlify dev` emula o banco de dados e o Blobs localmente. Migrações ficam em
`netlify/database/migrations/` e são aplicadas automaticamente pela Netlify no deploy.
Após alterar `db/schema.ts`, gere uma nova migração com:

```bash
npx drizzle-kit generate --name <descricao_da_mudanca>
```

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/session` | Identidade do dispositivo atual |
| POST | `/api/session` | Cria a identidade anônima (`{ nickname, recoveryKey }`) |
| PATCH | `/api/session` | Altera o nome (`{ nickname }`) |
| PUT | `/api/recovery-key` | Cria ou troca a chave de recuperação (`{ recoveryKey }`) |
| POST | `/api/restore` | Restaura a identidade pela chave de recuperação (`{ code }`) |
| GET | `/api/posts` | Feed público (`?author=`, `?before=`) |
| POST | `/api/posts` | Cria uma ação (multipart: `image`, `text`) |
| GET/DELETE | `/api/posts/:id` | Lê / exclui (somente o dono) |
| GET/POST | `/api/posts/:id/comments` | Lista / cria comentários |
| GET | `/api/images/:key` | Serve a foto armazenada |
