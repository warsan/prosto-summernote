# Summernote

Супер простой WYSIWYG-редактор.

[![Build Status](https://travis-ci.org/summernote/summernote.svg?branch=develop)](http://travis-ci.org/summernote/summernote)
[![npm version](https://badge.fury.io/js/summernote.svg)](http://badge.fury.io/js/summernote)
[![Coverage Status](https://coveralls.io/repos/summernote/summernote/badge.svg?branch=develop&service=github)](https://coveralls.io/github/summernote/summernote?branch=develop)

### Summernote

Summernote - это библиотека JavaScript, которая помогает создавать WYSIWYG-редакторы в Интернете.

Главная страница: <https://summernote.org>

### Почему именно Summernote?

Summernote имеет несколько особенностей:

- Вставка изображений из буфера обмена
- Сохраняет изображения непосредственно в содержимом поля, используя кодировку base64, поэтому вам не нужно реализовывать обработку изображений вообще
- Простой пользовательский интерфейс
- Интерактивное редактирование WYSIWYG
- Удобная интеграция с сервером
- Поддерживает интеграцию Bootstrap 3 и 4
- Множество [плагинов и коннекторов](https://github.com/summernote/awesome-summernote), предоставляемых вместе

### Установка и зависимости

Summernote построен на [jQuery](http://jquery.com/).

#### 1. Включить JS/CSS

Включите следующий код в тег `<head>` вашего HTML:

```html
<!-- включить библиотеки (jQuery, bootstrap) -->
<script
  type="text/javascript"
  src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"
></script>
<link
  rel="stylesheet"
  href="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.4.1/css/bootstrap.min.css"
/>
<script
  type="text/javascript"
  src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.4.1/js/bootstrap.min.js"
></script>

<!-- включить summernote css/js-->
<link href="summernote.css" rel="stylesheet" />
<script src="summernote.js"></script>
```

#### 2. Нацелить элемент

Затем поместите тег `div` куда-нибудь в тег `body`. Этот элемент будет заменен редактором summernote.

```html
<div id="summernote">Hello Summernote</div>
```

#### 3. Summernote это!

Наконец, запустите этот скрипт после того, как DOM будет готов:

```javascript
$(document).ready(function () {
  $("#summernote").summernote();
});
```

Другие примеры можно найти на сайте [домашняя страница](http://summernote.org/examples).

### API

`code` - получить исходный код HTML, лежащий в основе текста в редакторе:

```javascript
var html = $("#summernote").summernote("code");
```

Для получения более подробной информации об API, пожалуйста, обратитесь к [документу](http://summernote.org/getting-started/#basic-api).

#### Warning - code injection

Представление кода позволяет пользователю вводить содержимое сценария. Обязательно фильтруйте/[обеззараживайте HTML на сервере](https://github.com/search?l=JavaScript&q=sanitize+html). В противном случае злоумышленник может внедрить произвольный код JavaScript в клиенты.

### За внесение вклада

https://github.com/summernote/summernote/blob/develop/.github/CONTRIBUTING.md

### Контакты

- Группа пользователей Facebook: https://www.facebook.com/groups/summernote
- Summernote Slack: [Присоединяйтесь к сообществу Summernote Slack](https://communityinviter.com/apps/summernote/summernote)

## Тестирование с использованием

<a target="_blank" href="https://www.browserstack.com/"><img width="200" src="https://www.browserstack.com/images/layout/browserstack-logo-600x315.png"></a><br>
[Программа BrowserStack с открытым исходным кодом](https://www.browserstack.com/open-source)

### Лицензия

Summernote может свободно распространяться по лицензии MIT.
