# 🎌 Buscador de Anime — AniList API

Projeto desenvolvido para a disciplina de Desenvolvimento Web.  
Utiliza a API pública do [AniList](https://anilist.co) via GraphQL para buscar informações sobre animes e mangás.

---

## 📋 Funcionalidades

- Busca de animes e mangás pelo nome
- Filtro por tipo (Anime / Mangá)
- Ordenação por popularidade, nota ou trending
- Paginação dos resultados
- Modal com detalhes completos: sinopse, nota, episódios, estúdio, gêneros e mais

---

## 🗂️ Estrutura do Projeto

```
📁 projeto/
├── index.html      → estrutura da página
├── style.css       → estilização
└── javascript.js   → lógica e integração com a API
```

---

## 🚀 Como Executar

1. Baixe ou clone este repositório
2. Coloque os 3 arquivos na mesma pasta
3. Abra o arquivo `index.html` no navegador

> Não é necessário instalar nada ou usar servidor local.

---

## 🔧 Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- [AniList GraphQL API](https://docs.anilist.co)

---

## 📡 Sobre a API

A [AniList API](https://docs.anilist.co) é gratuita e pública.  
As requisições são feitas via `fetch` para o endpoint:

```
https://graphql.anilist.co
```

Exemplo de query utilizada no projeto:

```graphql
query ($busca: String, $pagina: Int) {
  Page(page: $pagina, perPage: 20) {
    media(search: $busca, type: ANIME) {
      id
      title { romaji english }
      averageScore
      episodes
    }
  }
}
```

---

## 👨‍💻 Autor

**Rafael Piasentin**  
🔗 LinkedIn: [https://www.linkedin.com/in/rafael-piasentin-b22149256/]