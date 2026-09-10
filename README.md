# Fhyl — protótipo de filmes e séries

Protótipo estático em HTML, CSS e JavaScript puro para validar a primeira experiência do app: pesquisar filmes e séries no TMDB, consultar seus detalhes e organizar listas locais.

## Como executar

Como os arquivos usam `fetch` para chamar a API do TMDB, abra o projeto por um servidor HTTP local. Não é necessário instalar framework ou dependência.

### Opção 1 — VS Code

1. Abra a pasta `C:\projects\Fhyl` no VS Code.
2. Instale a extensão **Live Server**, se ainda não tiver.
3. Clique com o botão direito em `index.html`.
4. Escolha **Open with Live Server**.

### Opção 2 — outro servidor local

Use qualquer servidor HTTP estático apontando para esta pasta. Abrir `index.html` diretamente pelo duplo clique pode bloquear chamadas `fetch` por causa das regras do navegador para arquivos `file://`.

## Primeiro uso

1. Obtenha no TMDB o **API Read Access Token**.
2. Abra `app.js` e localize a constante `TMDB_TOKEN` no início do arquivo.
3. Cole o token entre as aspas, salve o arquivo e recarregue o site.
4. Digite o nome de um filme ou série, como `Duna`, `The Office` ou `Breaking Bad`.
5. Clique em **Buscar**.
6. Clique em um card para abrir os detalhes completos.
7. Na seção **Suas listas**, clique em **+ Criar lista** para criar uma lista personalizada.
8. Depois de pesquisar, clique em **+ Adicionar à lista** no card de um filme.
9. Escolha **Assistidos**, **Quero Assistir**, **Compartilhado** ou uma lista personalizada.
10. Clique em uma lista para abrir seus filmes. Dentro dela, você pode removê-los.

O token é carregado exclusivamente da constante `TMDB_TOKEN` no arquivo `app.js`.

## O que o protótipo faz

- Pesquisa filmes e séries no endpoint `/search/multi` em `pt-BR`.
- Se não houver resultado, repete a pesquisa em `en-US`.
- Filtra pessoas retornadas pela busca combinada, mantendo somente filmes e séries.
- Exibe tipo, título, ano, pôster, sinopse e nota.
- Busca detalhes no endpoint `/movie/{id}` ou `/tv/{id}`, sempre com `language=pt-BR`.
- Exibe duração, gêneros, países, lançamento, sinopse, pôster e backdrop.
- Monta as URLs de imagens do TMDB a partir de `poster_path` e `backdrop_path`.
- Mantém as listas modelo **Assistidos**, **Quero Assistir** e **Compartilhado**.
- Permite criar listas personalizadas com nome próprio.
- Permite adicionar um filme a uma ou mais listas pelo botão **+ Adicionar à lista**.
- Permite abrir cada lista para ver os filmes salvos e removê-los.
- Salva as listas e os filmes adicionados no `localStorage` deste navegador.

## Fora do escopo desta etapa

- Login e usuários.
- Supabase ou qualquer backend.
- Status e avaliações persistentes.
- Token protegido por servidor.

O consumo direto da API pelo navegador é adequado para este protótipo local. Como o token escrito em `app.js` fica visível para qualquer pessoa que tenha acesso aos arquivos ou ao site publicado, não use esta abordagem como armazenamento secreto em produção; a etapa futura deverá usar um backend ou outra estratégia de proteção.
