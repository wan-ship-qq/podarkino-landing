# Подаркино Landing

Стартовая версия промо-лендинга для магазина подарков и сувениров «Подаркино».

## Сайт

Главная цель — презентовать бренд и отправить пользователя в магазин на Ozon:

https://www.ozon.ru/seller/podarkino/

## Запуск локально

```bash
python3 -m http.server 3000
```

Открыть в браузере:

```text
http://localhost:3000
```

## Структура

- `index.html` — разметка лендинга
- `styles.css` — адаптивные стили
- `admin.html` — редактор товаров и основных текстов
- `data/products.json` — товары на главной странице
- `data/content.json` — редактируемые тексты и ссылка магазина
- `docs/brief.md` — бриф проекта
- `marketing/landing-structure.md` — структура лендинга
- `marketing/copy.md` — тексты
- `design/` — дизайн-материалы
- `public/` — статические ассеты

## Редактор

Открыть:

```text
https://wan-ship-qq.github.io/podarkino-landing/admin.html
```

Для публикации изменений нужен GitHub token с правом `contents:write` к репозиторию.

## Что дальше

Заменить демо-карточки на реальные товары, фото, ссылки и отзывы с Ozon.
