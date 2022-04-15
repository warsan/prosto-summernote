## Отладка с помощью VSCode

Вы можете отлаживать модульные тесты с помощью VSCode, выполнив следующие действия:
(По материалам [статьи](http://blog.mlewandowski.com/Debugging-Karma-tests-with-VSCode.html))

1. Установите [VsCode](https://code.visualstudio.com/docs/setup/setup-overview)
2. Установите [debugger-for-chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) расширение.
3. Создайте файл launch.json в папке ~/.vscode со следующей конфигурацией:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "attach",
      "name": "Attach Karma Chrome",
      "address": "localhost",
      "port": 9333,
      "sourceMaps": true,
      "pathMapping": {
        "/": "${workspaceRoot}",
        "/base/": "${workspaceRoot}/"
      }
    }
  ]
}
```
4. В терминале запустите тест с помощью команды:
```
yarn test:debug
```
4. Открыть vscode
5. Установите точку останова на коде
6. Нажмите F5 для запуска Debug и дождитесь остановки на точке останова

## Опубликовать новую версию

### 1. `develop` to `master`

Отправьте pull request `develop` на репозиторий `master` на github и объедините его.
https://github.com/summernote/summernote/compare/master...develop


### 2. Build dist files

Соберите файлы диста и переместите их в мастер
```bash
# ветвь изменений
git checkout master

# получить все изменения
git pull

# Увеличение версии в файле package.json

# сборка файлов dist и бинарных файлов(.zip) для публикации релиза
yarn build

# Зафиксировать и добавить метку для новой версии
git commit -a -m "Update dist files"
git tag -a "<new-version>"

# Передача новых файлов dist и тегов в удаленное хранилище.
git push origin --tags
```

### 3. Выпуск новой версии
Опубликовать на github заметку о выпуске с новой версией тега

https://github.com/summernote/summernote/releases/new

### 4. Опубликовать

Публикация в реестре npm
```bash
yarn publish
```

### 5. Обновление summernote.github.io
Обновление версии summernote в `_config.yml`.

### 6. Обновление разъемов
Попросите сопровождающих каждого коннектора обновить информацию о пакете.
