## Вклад
* Запросы на исправление приветствуются
* Пожалуйста, `не включайте файлы dist/* в свои коммиты.

## Соглашение о кодировании
* eslint: https://eslint.org
* eslint rule: https://github.com/summernote/summernote/blob/master/.eslintrc

## Build summernote

Summernote использует [`yarn`](https://yarnpkg.com/) в качестве менеджера пакетов.

```bash
$ yarn install

# собрать полную версию summernote: dist/summernote.js
$ yarn build

```
На данном этапе у вас должен быть каталог `dist/`, заполненный всем необходимым для работы с summernote.

## Запустите локальный сервер для разработки Summernote.
запустите локальный сервер с webpack-dev-server и наблюдайте.

```bash
$ yarn dev
# Откройте браузер на сайте http://localhost:3000.
# Если вы измените исходный код, автоматически перезагрузите страницу.
```

## Test summernote
запускать тесты с помощью Karma и PhantomJS

```bash
$ yarn test
```

Если вы хотите запустить тесты в другом браузере,
изменить значения для свойств `browsers` в файле `karma.conf.js`.

```javascript
karma: {
  all: {
    browsers: ['PhantomJS'],
    reporters: ['progress']
  }
}

```

Or, pass `--browsers` argument via `yarn test` command.

```bash
$ yarn test -- --browsers Safari,Firefox
```

You can use `Chrome`, `ChromeCanary`, `Firefox`, `Opera`, `Safari`, `PhantomJS` and `IE` beside `PhantomJS`.
Once you run `yarn test`, it will watch all JavaScript file. Therefore karma runs tests every time you change code.

## Test a part of test

If you would like to run some part of your test codes, use the watch mode.

```bash
$ yarn test:watch
```

`karma` will run test and keep waiting other test requests. And then, run `test:grep` in another terminal. Below shows how to run `LinkDialog` related tests only.

```bash
$ yarn test:grep LinkDialog
```

## Prepush Hooks
As part of this repo, we use [Husky](https://github.com/typicode/husky) for git hooks. We leverage the prepush hook to prevent bad commits.

## Document structure

```text
 - body container: <div class="note-editable">, <td>, <blockquote>, <ul>
 - block node: <div>, <p>, <li>, <h1>, <table>
 - void block node: <hr>
 - inline node: <span>, <b>, <font>, <a>, ...
 - void inline node: <img>
 - text node: #text
```

1. A body container has block node, but `<ul>` has only `<li>` nodes.
1. A body container also has inline nodes sometimes. This inline nodes will be wrapped with `<p>` when enter key pressed.
1. A block node only has inline nodes.
1. A inline nodes has another inline nodes
1. `#text` and void inline node doesn't have children.
