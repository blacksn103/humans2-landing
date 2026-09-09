# Humans² — landing (humans2.ai)

Одностраничный лендинг без сборки: один файл `index.html` (Three.js и шрифты подгружаются с CDN).

## Деплой (любой вариант, 2–5 минут)

**Vercel (рекомендую):** https://vercel.com/new → drag-and-drop папки `humans2-landing` → Deploy.
Затем Settings → Domains → добавить `humans2.ai`; в DNS домена поставить A-запись `76.76.21.21` и CNAME `www` → `cname.vercel-dns.com`.

**Netlify:** https://app.netlify.com/drop → перетащить папку → Domain settings → добавить `humans2.ai`.

**GitHub Pages:** запушить в репозиторий, Settings → Pages → Deploy from branch `main` / root, добавить custom domain `humans2.ai`.

## Что поменять
- Email в кнопках `Contact us`: сейчас `hello@humans2.ai` (два места в `index.html` + футер).
- Заголовок/подзаголовок — в блоке `<main>`.
