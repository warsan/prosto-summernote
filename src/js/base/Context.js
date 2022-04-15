import $ from 'jquery';
import func from './core/func';
import lists from './core/lists';
import dom from './core/dom';

export default class Context {
  /**
   * @param {jQuery} $note
   * @param {Object} options
   */
  constructor($note, options) {
    this.$note = $note;

    this.memos = {};
    this.modules = {};
    this.layoutInfo = {};
    this.options = $.extend(true, {}, options);

    // init ui with options
    $.summernote.ui = $.summernote.ui_template(this.options);
    this.ui = $.summernote.ui;

    this.initialize();
  }

  /**
   * создание макета и инициализация модулей и других ресурсов
   */
  initialize() {
    this.layoutInfo = this.ui.createLayout(this.$note);
    this._initialize();
    this.$note.hide();
    return this;
  }

  /**
   * уничтожать модули и другие ресурсы и удалять компоновку
   */
  destroy() {
    this._destroy();
    this.$note.removeData('summernote');
    this.ui.removeLayout(this.$note, this.layoutInfo);
  }

  /**
   * уничтожить модули и другие ресурсы и инициализировать его снова
   */
  reset() {
    const disabled = this.isDisabled();
    this.code(dom.emptyPara);
    this._destroy();
    this._initialize();

    if (disabled) {
      this.disable();
    }
  }

  _initialize() {
    // установить собственный идентификатор
    this.options.id = func.uniqueId($.now());
    // установить контейнер по умолчанию для всплывающих подсказок, всплывающих окон и диалоговых окон
    this.options.container = this.options.container || this.layoutInfo.editor;

    // добавить дополнительные кнопки
    const buttons = $.extend({}, this.options.buttons);
    Object.keys(buttons).forEach((key) => {
      this.memo('button.' + key, buttons[key]);
    });

    const modules = $.extend({}, this.options.modules, $.summernote.plugins || {});

    // добавление и инициализация модулей
    Object.keys(modules).forEach((key) => {
      this.module(key, modules[key], true);
    });

    Object.keys(this.modules).forEach((key) => {
      this.initializeModule(key);
    });
  }

  _destroy() {
    // уничтожать модули в обратном порядке
    Object.keys(this.modules).reverse().forEach((key) => {
      this.removeModule(key);
    });

    Object.keys(this.memos).forEach((key) => {
      this.removeMemo(key);
    });
    // обратный вызов пользовательского триггера onDestroy
    this.triggerEvent('destroy', this);
  }

  code(html) {
    const isActivated = this.invoke('codeview.isActivated');

    if (html === undefined) {
      this.invoke('codeview.sync');
      return isActivated ? this.layoutInfo.codable.val() : this.layoutInfo.editable.html();
    } else {
      if (isActivated) {
        this.invoke('codeview.sync', html);
      } else {
        this.layoutInfo.editable.html(html);
      }
      this.$note.val(html);
      this.triggerEvent('change', html, this.layoutInfo.editable);
    }
  }

  isDisabled() {
    return this.layoutInfo.editable.attr('contenteditable') === 'false';
  }

  enable() {
    this.layoutInfo.editable.attr('contenteditable', true);
    this.invoke('toolbar.activate', true);
    this.triggerEvent('disable', false);
    this.options.editing = true;
  }

  disable() {
    // закрыть окно просмотра кода, если окно просмотра открыто
    if (this.invoke('codeview.isActivated')) {
      this.invoke('codeview.deactivate');
    }
    this.layoutInfo.editable.attr('contenteditable', false);
    this.options.editing = false;
    this.invoke('toolbar.deactivate', true);

    this.triggerEvent('disable', true);
  }

  triggerEvent() {
    const namespace = lists.head(arguments);
    const args = lists.tail(lists.from(arguments));

    const callback = this.options.callbacks[func.namespaceToCamel(namespace, 'on')];
    if (callback) {
      callback.apply(this.$note[0], args);
    }
    this.$note.trigger('summernote.' + namespace, args);
  }

  initializeModule(key) {
    const module = this.modules[key];
    module.shouldInitialize = module.shouldInitialize || func.ok;
    if (!module.shouldInitialize()) {
      return;
    }

    // инициализировать модуль
    if (module.initialize) {
      module.initialize();
    }

    // прикреплять события
    if (module.events) {
      dom.attachEvents(this.$note, module.events);
    }
  }

  module(key, ModuleClass, withoutIntialize) {
    if (arguments.length === 1) {
      return this.modules[key];
    }

    this.modules[key] = new ModuleClass(this);

    if (!withoutIntialize) {
      this.initializeModule(key);
    }
  }

  removeModule(key) {
    const module = this.modules[key];
    if (module.shouldInitialize()) {
      if (module.events) {
        dom.detachEvents(this.$note, module.events);
      }

      if (module.destroy) {
        module.destroy();
      }
    }

    delete this.modules[key];
  }

  memo(key, obj) {
    if (arguments.length === 1) {
      return this.memos[key];
    }
    this.memos[key] = obj;
  }

  removeMemo(key) {
    if (this.memos[key] && this.memos[key].destroy) {
      this.memos[key].destroy();
    }

    delete this.memos[key];
  }

  /**
   * Некоторые кнопки должны немедленно менять свой визуальный стиль после нажатия на них
   */
  createInvokeHandlerAndUpdateState(namespace, value) {
    return (event) => {
      this.createInvokeHandler(namespace, value)(event);
      this.invoke('buttons.updateCurrentStyle');
    };
  }

  createInvokeHandler(namespace, value) {
    return (event) => {
      event.preventDefault();
      const $target = $(event.target);
      this.invoke(namespace, value || $target.closest('[data-value]').data('value'), $target);
    };
  }

  invoke() {
    const namespace = lists.head(arguments);
    const args = lists.tail(lists.from(arguments));

    const splits = namespace.split('.');
    const hasSeparator = splits.length > 1;
    const moduleName = hasSeparator && lists.head(splits);
    const methodName = hasSeparator ? lists.last(splits) : lists.head(splits);

    const module = this.modules[moduleName || 'editor'];
    if (!moduleName && this[methodName]) {
      return this[methodName].apply(this, args);
    } else if (module && module[methodName] && module.shouldInitialize()) {
      return module[methodName].apply(module, args);
    }
  }
}
