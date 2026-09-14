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

1. Abra a aplicação e informe seu nome na tela inicial.
2. Obtenha no TMDB o **API Read Access Token**.
3. Abra `shared.js` e localize a constante `TMDB_TOKEN` no início do arquivo.
4. Cole o token entre as aspas, salve o arquivo e recarregue o site.
5. Aguarde o catálogo de títulos em alta carregar automaticamente.
6. Digite um filme ou série na busca e clique em **Buscar** para abrir os resultados em uma nova janela.
7. Clique em um card para abrir os detalhes completos.
8. Na seção **Suas listas**, escolha uma das três prateleiras disponíveis.
9. Clique com o botão direito em um card para abrir o menu de listas.
10. Escolha **Favoritos**, **Assistido** ou **Quero Assistir**.
11. Clique em **Ver lista** para abrir os títulos salvos. Dentro dela, você pode removê-los.

A barra de busca abre os resultados em uma janela separada.

O token é carregado exclusivamente da constante `TMDB_TOKEN` no arquivo `shared.js`.

## O que o protótipo faz

- Carrega automaticamente títulos em alta no endpoint `/trending/all/week` em `pt-BR`.
- Solicita o nome no primeiro acesso e exibe uma saudação no header da home.
- Busca filmes e séries no endpoint `/search/multi` em `pt-BR`, usando `en-US` como fallback.
- Filtra pessoas retornadas pela busca e pelo catálogo em alta, mantendo somente filmes e séries.
- Abre as buscas em uma janela nomeada `fhylSearch`, sem substituir o catálogo em alta da home.
- Repete a busca em `en-US` quando não há resultados em português.
- Exibe tipo, título, ano, pôster, sinopse e nota.
- Busca detalhes no endpoint `/movie/{id}` ou `/tv/{id}`, sempre com `language=pt-BR`.
- Exibe duração, gêneros, países, lançamento, sinopse, pôster e backdrop.
- Monta as URLs de imagens do TMDB a partir de `poster_path` e `backdrop_path`.
- Mantém as três listas modelo **Favoritos**, **Assistido** e **Quero Assistir**.
- Exibe cada lista como uma prateleira horizontal com os pôsteres salvos.
- Permite adicionar ou remover um filme das listas pelo menu de contexto.
- Permite abrir cada lista para ver os filmes salvos e removê-los.
- Salva as listas e os filmes adicionados no `localStorage` deste navegador.
- Migra listas antigas, preservando **Assistidos** e **Quero Assistir**; listas **Compartilhado** e personalizadas antigas são descartadas.

## Fora do escopo desta etapa

- Login e usuários.
- Supabase ou qualquer backend.
- Status e avaliações persistentes.
- Token protegido por servidor.

O consumo direto da API pelo navegador é adequado para este protótipo local. Como o token escrito em `shared.js` fica visível para qualquer pessoa que tenha acesso aos arquivos ou ao site publicado, não use esta abordagem como armazenamento secreto em produção; a etapa futura deverá usar um backend ou outra estratégia de proteção.
