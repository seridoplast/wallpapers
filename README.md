# Seridóplast Wallpaper Studio

Sistema web para gerar wallpapers corporativos com **nome e cargo**, usando os fundos institucionais da Seridóplast. Funciona no **GitHub Pages sem servidor, banco de dados ou etapa de build**.

## Recursos

- Nome e cargo personalizáveis, com visualização em tempo real.
- Tema institucional criado a partir da imagem original fornecida, mais duas variações de cores de texto.
- Exportação PNG em Full HD, Quad HD, 2048 × 1152, 1366 × 768 ou 4K.
- Ajuste automático de textos longos (tamanho e quebra em linhas).
- Área administrativa com autorização **real de escrita do GitHub**, sem senha fixa no código.
- Upload de novas imagens e configuração de estilo, posição, alinhamento e tamanhos dos textos.
- Publicação direto no repositório através da API GitHub (o Pages atualiza após o commit).
- Interface responsiva. Não usa dependências JavaScript externas.

## Como colocar no GitHub Pages

**Forma mais simples:**

1. Crie um repositório no GitHub (exemplo: `seridoplast-wallpapers`).
2. Extraia o ZIP do projeto e envie **o conteúdo da pasta**, mantendo o arquivo `index.html` na raiz do repositório.
3. Faça o commit na branch `main`.
4. Em **Settings → Pages → Build and deployment → Source**, escolha **Deploy from a branch**.
5. Selecione **main** e **/(root)**, depois **Save**.
6. Seu site ficará no endereço `https://SEU-USUARIO.github.io/seridoplast-wallpapers/` (caso seja um repositório de projeto).

Se preferir Git no terminal, na pasta extraída:

```bash
git init
git add .
git commit -m "Publica Wallpaper Studio Seridóplast"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/seridoplast-wallpapers.git
git push -u origin main
```

> Caso o repositório já tenha sido criado com README ou outro commit, sincronize seu histórico primeiro antes de usar `git push`.

## Acesso administrativo e publicação de temas

O site é estático, portanto **uma senha fixa dentro do JavaScript não ofereceria segurança**: qualquer visitante conseguiria visualizá-la. Para assegurar que **só você publique ou apague temas**, o painel usa um token temporário de acesso ao GitHub, com as permissões verificadas pelo GitHub.

1. No GitHub, abra https://github.com/settings/personal-access-tokens e crie um **fine-grained personal access token**.
2. Em **Repository access**, selecione **Only select repositories** e escolha exclusivamente o repositório do Wallpaper Studio.
3. Em **Repository permissions**, conceda **Contents → Read and write**. Não dê permissões além das necessárias. Escolha um prazo de validade apropriado.
4. No site, clique **Área do gestor**.
5. Informe **usuário/organização**, **nome do repositório**, **branch** e o **token**.
6. Clique **Conectar e editar temas**, depois **+ Novo tema** ou **Editar**.
7. Faça upload do fundo e ajuste fontes, cores, largura e posição. Salve o rascunho.
8. Clique **Publicar no GitHub**. A ferramenta enviará cada nova imagem a `assets/themes/` e atualizará `themes.json` por commits na branch configurada.

**Segurança:** o token não fica guardado no projeto, nos arquivos publicados, nem no armazenamento local do navegador. Ele existe apenas na memória da aba durante a conexão. Ao sair ou recarregar a página, precisa ser informado novamente. Nunca compartilhe o token ou o coloque nos arquivos do site.

**Importante:** o botão administrativo é público (qualquer pessoa pode vê-lo), mas publicar arquivos exige uma credencial GitHub com permissão de escrita no repositório. O site em si e os wallpapers publicados são públicos no GitHub Pages.

## Trocar a arte inicial

O fundo original está em `assets/wallpaper-base.png`, sem o nome e o cargo. Ele contém o logotipo oficial na própria imagem. Para criar um tema com imagem diferente, utilize uma arte **sem os textos dinâmicos**. O painel converte a imagem para WebP de 2048 × 1152 pixels. A imagem importada é redimensionada com corte central para 16:9 caso tenha outra proporção.

Os três temas de exemplo têm o mesmo fundo, mas cores e tipografia diferentes. Eles podem ser editados pelo painel.

## Estrutura

```text
index.html              página principal
style.css               layout e responsividade
app.js                  gerador, prévia e administração
themes.json             temas publicados
assets/wallpaper-base.png  fundo original sem cargo/nome
assets/themes/          imagens dos novos temas
```

## Testar localmente

Abra um terminal na pasta do projeto:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`. Não abra o arquivo por `file://`, pois alguns navegadores bloqueiam a leitura de `themes.json` nesse formato.

## Observações

- A publicação exige GitHub Pages habilitado e a branch do painel deve ser a **mesma branch** configurada no Pages.
- Se outra pessoa editar `themes.json` após o login, a ferramenta interrompe a publicação para evitar sobrescrever alterações. Reconecte-se e revise os temas.
- Se o upload de uma imagem funcionar, mas a publicação do manifesto falhar, uma imagem não utilizada poderá ficar em `assets/themes/`. Isso não muda os wallpapers publicados.
- O site busca a fonte Poppins pelo Google Fonts e usa uma fonte substituta caso a rede esteja indisponível; a tipografia pode variar ligeiramente offline.
- A qualidade do PNG 4K depende da resolução da arte de fundo (original: 2048 × 1152, portanto ela é ampliada na saída 4K).
