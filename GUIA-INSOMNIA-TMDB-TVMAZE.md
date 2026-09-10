# Guia do Insomnia — TMDB e TVmaze

Este guia acompanha o arquivo `insomnia-tmdb-tvmaze-export.json`, criado a partir da especificação `spec-apis-tmdb-tvmaze.md`.

## O que foi preparado

A coleção contém duas pastas:

### TMDB — Filmes

1. Buscar filme — pt-BR
2. Buscar filme — en-US (fallback)
3. Detalhes do filme
4. Títulos alternativos do filme
5. Buscar série no TMDB — opcional

As requisições TMDB usam o header:

```text
Authorization: Bearer SEU_TOKEN
```

### TVmaze — Séries

1. Buscar série
2. Detalhes da série
3. Episódios da série

TVmaze é público e não exige token.

## Passo 1 — Obter o token do TMDB

1. Acesse `https://www.themoviedb.org/` e entre na sua conta.
2. Abra as configurações da conta.
3. Entre na seção **API**.
4. Crie ou copie o **API Read Access Token**.
5. Não compartilhe esse token no chat, em screenshots ou em repositórios públicos.

O arquivo de exportação contém apenas o texto `COLE_SEU_TMDB_READ_ACCESS_TOKEN_AQUI`; ele não contém uma chave real.

## Passo 2 — Importar a coleção

1. Abra o Insomnia.
2. Crie ou selecione um projeto/workspace.
3. No cabeçalho do workspace, clique em **Import**.
4. Escolha **File**.
5. Selecione o arquivo `insomnia-tmdb-tvmaze-export.json`.
6. Se o Insomnia mostrar uma tela de análise, clique em **Scan** e depois em **Import**.
7. Confirme que aparecem as pastas **TMDB — Filmes** e **TVmaze — Séries**.

O Insomnia aceita a importação de coleções em Insomnia JSON v4. A versão atual também possui formatos nativos v5, mas o arquivo preparado aqui usa v4 para facilitar a importação como um único JSON.

## Passo 3 — Configurar o ambiente

1. Na parte superior do Insomnia, localize o seletor de ambiente.
2. Selecione **Base Environment**.
3. Abra o editor do ambiente — dependendo da versão, isso pode ser feito clicando no nome do ambiente ou em **Manage Environments**.
4. Localize:

```json
"tmdb_read_access_token": "COLE_SEU_TMDB_READ_ACCESS_TOKEN_AQUI"
```

5. Substitua somente o texto do valor pelo seu token real:

```json
"tmdb_read_access_token": "seu-token-real-do-tmdb"
```

6. Salve o ambiente.

As outras variáveis já vêm preenchidas com exemplos:

```json
{
  "tmdb_query": "Inception",
  "tmdb_movie_id": "27205",
  "tvmaze_query": "Breaking Bad",
  "tvmaze_show_id": "169"
}
```

Você pode trocar esses valores depois. As requisições usam variáveis no formato `{{ _.nome_da_variavel }}`.

## Passo 4 — Fazer o primeiro teste, sem token

Comece pelo TVmaze porque ele não precisa de autenticação.

1. Abra **TVmaze — Séries**.
2. Abra **Buscar série**.
3. Confira que o parâmetro `q` está com o valor `{{ _.tvmaze_query }}`.
4. Clique em **Send**.
5. O resultado esperado é HTTP **200 OK**.
6. No JSON retornado, procure um item com esta estrutura:

```json
{
  "score": 0.9,
  "show": {
    "id": 169,
    "name": "Breaking Bad"
  }
}
```

O valor de `show.id` é o ID que será usado em **Detalhes da série** e **Episódios da série**.

## Passo 5 — Buscar um filme no TMDB

1. Abra **TMDB — Filmes**.
2. Abra **Buscar filme — pt-BR**.
3. Confirme que o parâmetro `query` está usando `{{ _.tmdb_query }}`.
4. Clique em **Send**.
5. Espere uma resposta HTTP **200 OK**.
6. No JSON, procure o array `results`.
7. Copie o `id` do filme correto.

Para testar outro filme, altere `tmdb_query` no ambiente. Exemplos:

```text
Duna
O Poderoso Chefão
Interestelar
```

## Passo 6 — Usar o fallback em inglês

Se a busca pt-BR vier vazia ou não encontrar o título correto:

1. Abra **Buscar filme — en-US (fallback)**.
2. Mantenha o mesmo valor de `tmdb_query`.
3. Clique em **Send**.
4. Escolha o resultado correto pelo `title`, `original_title` e `release_date`.

O fallback só muda o parâmetro `language` para `en-US`.

## Passo 7 — Consultar detalhes do filme

1. Pegue o `id` do filme na busca.
2. Abra o ambiente **Base Environment**.
3. Atualize `tmdb_movie_id`, por exemplo:

```json
"tmdb_movie_id": "27205"
```

4. Abra **Detalhes do filme**.
5. Clique em **Send**.
6. A resposta deve conter campos como `runtime`, `genres`, `poster_path`, `backdrop_path`, `overview`, `vote_average` e `production_countries`.

## Passo 8 — Consultar títulos alternativos

1. Verifique se `tmdb_movie_id` é o ID correto.
2. Abra **Títulos alternativos do filme**.
3. Clique em **Send**.
4. Procure a lista `titles`.
5. Para o título brasileiro, procure o objeto cujo campo `iso_3166_1` seja `BR`.

## Passo 9 — Consultar detalhes e episódios da série

1. Na resposta de **Buscar série**, copie `show.id`.
2. Atualize `tvmaze_show_id` no **Base Environment**.
3. Abra **Detalhes da série** e clique em **Send**.
4. Para listar episódios, abra **Episódios da série** e clique em **Send**.
5. Nos episódios, os campos principais são `id`, `name`, `season`, `number`, `airdate` e `summary`.

## Passo 10 — Entender as imagens

### TMDB

O TMDB retorna caminhos relativos, como:

```text
/abc123.jpg
```

Monte a URL completa usando:

```text
https://image.tmdb.org/t/p/w500/abc123.jpg
```

Tamanhos comuns:

- `w200`: miniatura
- `w500`: tamanho intermediário
- `original`: resolução original

### TVmaze

O TVmaze já retorna URLs completas em `image.medium` e `image.original`.

## Passo 11 — O que cada resposta serve para o aplicativo

- Busca: permite ao usuário escolher o título e salvar o ID externo.
- Detalhes: preenche o cache local da tabela `titles`.
- Títulos alternativos: ajuda a exibir o título brasileiro.
- Episódios: pode alimentar controle de progresso por episódio no futuro.
- Nota, status, watchlist e lista compartilhada: não pertencem ao TMDB/TVmaze; devem ser gravados no Supabase conforme a especificação.

## Erros comuns

### `401 Unauthorized` ou `403 Forbidden` no TMDB

O token está ausente, incorreto ou foi colado com espaços extras. Edite `tmdb_read_access_token` no ambiente e tente novamente.

### `404 Not Found`

O ID está errado ou pertence a outra fonte. TMDB e TVmaze têm IDs independentes: um ID do TMDB não deve ser usado na URL do TVmaze.

### `200 OK`, mas `results` está vazio

Troque o termo de busca, confira o ambiente selecionado e tente a requisição TMDB em inglês.

### `429 Too Many Requests`

A API recebeu muitas requisições em pouco tempo. Aguarde alguns segundos e tente novamente.

### A URL mostra `{{ _.variavel }}` sem substituir

O ambiente correto não está selecionado. Selecione **Base Environment** no seletor de ambiente e confira se o nome da variável está exatamente igual.

## Cuidados com o token

- Não envie o token no chat.
- Não coloque o token em um arquivo versionado.
- Não use o token em screenshots compartilhadas.
- Se o token vazar, revogue-o no painel do TMDB e gere outro.

