<div align="center">
  <img src="assets/seridoplast-symbol.png" width="92" alt="Símbolo da Seridóplast">
  <h1>Seridóplast Wallpaper Studio</h1>
  <p><strong>Wallpapers corporativos personalizados em poucos cliques.</strong></p>
  <p>Uma ferramenta simples para criar fundos de tela com <strong>nome e setor</strong>, seguindo a identidade visual da Seridóplast.</p>
  <p>
    <img src="https://img.shields.io/badge/HTML%20%2B%20CSS%20%2B%20JS-sem%20framework-ffd21a?style=flat-square&labelColor=292c30" alt="HTML CSS JavaScript">
    <img src="https://img.shields.io/badge/GitHub%20Pages-publica%C3%A7%C3%A3o%20autom%C3%A1tica-ffffff?style=flat-square&labelColor=292c30" alt="GitHub Pages">
    <img src="https://img.shields.io/badge/PNG-at%C3%A9%204K-ffd21a?style=flat-square&labelColor=292c30" alt="Exportação PNG até 4K">
  </p>
  <p><a href="https://seridoplast.github.io/wallpapers/"><strong>🌐 Abrir o Wallpaper Studio</strong></a></p>
</div>

---

## ✨ Prévia do wallpaper

<div align="center">
  <img src="assets/readme-preview.jpg" alt="Exemplo de wallpaper Seridóplast com setor Comercial e nome Ana Silva" width="900">
  <sub>Exemplo ilustrativo. A pré-visualização real e o download são gerados pelo navegador.</sub>
</div>

## O que você consegue fazer

| Para colaboradores | Para gestores |
| :--- | :--- |
| Informar **nome e setor** | Criar, editar e remover temas |
| Ajustar tamanho das fontes, largura e **distância entre setor e nome** | Definir a distância padrão entre setor e nome para cada tema |
| Visualizar alterações imediatamente | Enviar novos fundos (PNG/JPG/WebP) |
| Escolher entre três estilos iniciais | Ajustar posição, alinhamento, tamanho e cor dos textos |
| Exportar PNG em Full HD, 2K, 4K e mais | Publicar temas no repositório pelo painel |
| Usar no desktop, notebook ou celular | Administrar com autorização de escrita do GitHub |

**Identidade visual:** o site usa o símbolo oficial enviado para o cabeçalho e para o favicon. O fundo institucional mantém a arte original com a assinatura **“Acreditamos na força do trabalho!”**.

## 🚀 Publicação automática no GitHub Pages

Este repositório já inclui o workflow **`.github/workflows/pages.yml`**. A cada `push` na branch `main`, o GitHub Actions valida o JavaScript e o JSON, prepara os arquivos estáticos e publica o site automaticamente.

**Configuração única necessária no GitHub:**

1. Abra o repositório **`seridoplast/wallpapers`**.
2. Acesse **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **GitHub Actions** (não *Deploy from a branch*).
4. Volte à aba **Actions** e acompanhe o workflow **Publicar Wallpaper Studio no GitHub Pages**.
5. Quando a execução estiver verde, acesse **https://seridoplast.github.io/wallpapers/**.

> ⚠️ **Importante:** adicionar o workflow ao commit não altera automaticamente a configuração **Source** do repositório. É necessário selecionar **GitHub Actions** uma vez na interface do GitHub. Se o site não abrir, confirme também que o `git push` foi aceito e que os arquivos aparecem na branch `main`.

### Atualizar o projeto existente (PowerShell)

Na pasta `C:\Users\Usuario\Documents\REPOSITORIOS\wallpapers`, extraia o conteúdo do ZIP sobre os arquivos antigos, **preservando a pasta `.git` existente**. Não copie apenas a pasta do ZIP: o `index.html` precisa ficar na raiz do repositório.

```powershell
git add .
git commit -m "feat: setor, logo e deploy automatico do wallpaper studio"
git push -u origin main
```

Não precisa criar outro repositório nem rodar `git init` novamente. Se aparecer **`Write access to repository not granted`**, resolva a autenticação/permissão do GitHub; nenhum arquivo do projeto corrige essa permissão.

### Para testar localmente

```powershell
python -m http.server 8000
```

Abra **http://localhost:8000**. Use um servidor local porque a leitura de `themes.json` pode ser bloqueada ao abrir o HTML por `file://`.

## 🔐 Administração de temas

O botão **Área do gestor** fica no canto superior direito. O acesso usa um **Personal Access Token (fine-grained)** do GitHub, em vez de uma senha embutida no site público.

1. Acesse [GitHub → Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens).
2. Crie um token com acesso **somente** ao repositório `seridoplast/wallpapers`.
3. Em **Repository permissions**, selecione **Contents → Read and write**.
4. No site, abra **Área do gestor**. Os campos do repositório são preenchidos automaticamente quando o site está no GitHub Pages.
5. Cole o token, conecte-se, crie/edite temas e clique em **Publicar no GitHub**.
6. O painel cria commits na branch `main`; o workflow faz o deploy em seguida.

**Segurança:** o token fica apenas na memória da aba durante a sessão; não é gravado em `localStorage` nem no repositório. Não compartilhe o token. O painel de login é visível para todos, mas **só quem possui permissão de escrita no repositório consegue publicar**. O site e os temas publicados são públicos.

## 📁 Estrutura do projeto

```text
wallpapers/
├── .github/workflows/pages.yml   # Deploy automático em cada push na main
├── .gitattributes                 # Padronização de finais de linha
├── .gitignore
├── .nojekyll
├── assets/
│   ├── wallpaper-base.png         # Fundo institucional, sem textos dinâmicos
│   ├── seridoplast-symbol.png     # Símbolo oficial original
│   ├── favicon-64.png             # Favicon PNG
│   ├── icon-192.png               # Ícone do site
│   ├── icon-512.png               # Ícone do site
│   ├── apple-touch-icon.png       # Ícone Apple
│   ├── readme-preview.jpg         # Ilustração do README
│   └── themes/                   # Novas imagens publicadas pelo painel
├── favicon.ico
├── index.html                     # Interface
├── style.css                      # Layout responsivo
├── app.js                         # Gerador e painel administrativo
├── themes.json                    # Configuração dos temas
└── README.md
```

## ⚙️ Detalhes técnicos

- **100% estático:** sem servidor próprio, banco de dados ou dependências npm.
- **Canvas API:** gera a prévia e o PNG no próprio navegador.
- **Distância entre textos:** controle de 0% a 10% da altura da imagem. O gestor define o padrão em cada tema e o colaborador pode ajustá-lo na personalização, com prévia imediata e exportação fiel. Temas antigos sem a propriedade `textGap` mantêm 1,8%, como antes.
- **Fontes:** Poppins via Google Fonts, com fallback local.
- **Imagens de temas:** upload convertido para WebP 2048 × 1152 (corte central em outras proporções).
- **Compatibilidade:** o leitor de temas aceita também campos antigos `roleColor`/`roleSize` e os converte para `sectorColor`/`sectorSize`.
- **4K:** o PNG é exportado em 3840 × 2160, mas a arte original de 2048 × 1152 é ampliada; isso não cria novos detalhes.
- **Atualização:** commits feitos pelo painel disparam o mesmo workflow de publicação.

---

<div align="center">
  <strong>Seridóplast</strong><br>
  Acreditamos na força do trabalho!
</div>
