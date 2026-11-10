# Portfolio - Rafael Eduardo Azzi Lopes (@obertobr)

Meu site de portfólio pessoal, desenvolvido para apresentar meus projetos, experiências e linguagens de forma rápida, limpa e com renderização no servidor (SSR).

---

## Tecnologias e Escolhas Técnicas

- **[Astro v5](https://astro.build/)** (Modo SSR Standalone com `@astrojs/node`): Escolhido pela facilidade em trabalhar com renderização no servidor e por não enviar JavaScript desnecessário para o cliente por padrão.
- **Node.js & TypeScript**: Tipagem estática em todo o código e execução estável no servidor.
- **CSS Puro**: Sem frameworks externos (como Tailwind ou Bootstrap). Todas as variáveis de design são resolvidas diretamente no build/servidor por um plugin interno do Vite para não quebrar em navegadores sem suporte a Custom Properties.
- **[@resvg/resvg-js](https://github.com/RazrFalcon/resvg-js)**: Utilizado para converter em milissegundos o SVG gerado dinamicamente no servidor em imagem PNG para as redes sociais.
- **Nginx & PM2**: O PM2 mantém a aplicação rodando no VPS e o Nginx atua como proxy reverso, gerenciando SSL e o roteamento de domínios e subdomínios.

---

## Compatibilidade com Navegadores

O site foi pensado e estruturado para funcionar no maior número possível de navegadores, desde versões muito antigas até as mais atuais:

- **Sem dependência de JavaScript**: Toda a navegação e até mesmo os filtros de projetos por linguagem funcionam 100% via servidor (SSR e query parameters). Se o usuário desativar o JS ou o navegador não suportar, o site continua funcionando normalmente.
- **Resolução de CSS no Servidor**: O plugin do Vite substitui as variáveis CSS pelos valores reais antes de enviar o arquivo, garantindo que navegadores sem suporte a `var(--...)` renderizem as cores e espaçamentos corretamente.
- **Fallbacks de Layout**: Uso de regras simples e compatíveis com browsers legados (como `float` e `inline-block`) com melhoria progressiva para navegadores com suporte a Grid e Flexbox.

---

## SEO

Estruturado com meta tags essenciais, tags canônicas que identificam o host correto mesmo atrás de proxy reverso, além de geração dinâmica de `sitemap.xml` e `robots.txt`.

---

## Open Graph Dinâmico (`/og.png`)

Ao compartilhar o link do site no Discord, WhatsApp, Twitter ou LinkedIn, o endpoint `/og.png` gera na hora uma imagem personalizada (1200x630) contendo:
- Fundo com o padrão do Jogo da Vida (Conway's Game of Life) com linhas contínuas.
- Dados atualizados de carreira (anos de experiência, projetos públicos e linguagens).
- Cards com as principais linguagens e suas porcentagens reais extraídas dos repositórios.

![Preview Open Graph Dinâmico](https://portfolio.obertobr.space/og.png)

---

## Sincronização com o GitHub

O site não utiliza dados estáticos manuais para projetos e tecnologias:
- Um script consome a API REST do GitHub trazendo dados de repositórios, descrições, estrelas e o cálculo de uso de cada linguagem.
- O script roda automaticamente antes de cada build (`prebuild`) e também é executado uma vez por dia no servidor de forma agendada para manter as informações sempre atualizadas sem precisar de deploy manual.
