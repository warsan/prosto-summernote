import $ from 'jquery';

export default class Dropzone {
  constructor(context) {
    this.context = context;
    this.$eventListener = $(document);
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.documentEventHandlers = {};

    this.$dropzone = $([
      '<div class="note-dropzone">',
        '<div class="note-dropzone-message"></div>',
      '</div>',
    ].join('')).prependTo(this.$editor);
  }

  /**
   * прикрепить события перетаскивания
   */
  initialize() {
    if (this.options.disableDragAndDrop) {
      // предотвращение события падения по умолчанию
      this.documentEventHandlers.onDrop = (e) => {
        e.preventDefault();
      };
      // не рассматривать за пределами дропзоны
      this.$eventListener = this.$dropzone;
      this.$eventListener.on('drop', this.documentEventHandlers.onDrop);
    } else {
      this.attachDragAndDropEvent();
    }
  }

  /**
   * прикрепить события перетаскивания
   */
  attachDragAndDropEvent() {
    let collection = $();
    const $dropzoneMessage = this.$dropzone.find('.note-dropzone-message');

    this.documentEventHandlers.onDragenter = (e) => {
      const isCodeview = this.context.invoke('codeview.isActivated');
      const hasEditorSize = this.$editor.width() > 0 && this.$editor.height() > 0;
      if (!isCodeview && !collection.length && hasEditorSize) {
        this.$editor.addClass('dragover');
        this.$dropzone.width(this.$editor.width());
        this.$dropzone.height(this.$editor.height());
        $dropzoneMessage.text(this.lang.image.dragImageHere);
      }
      collection = collection.add(e.target);
    };

    this.documentEventHandlers.onDragleave = (e) => {
      collection = collection.not(e.target);

      // Если nodeName является BODY, то просто переделайте его (исправление для IE)
      if (!collection.length || e.target.nodeName === 'BODY') {
        collection = $();
        this.$editor.removeClass('dragover');
      }
    };

    this.documentEventHandlers.onDrop = () => {
      collection = $();
      this.$editor.removeClass('dragover');
    };

    // отображение дропзоны на драгцентре при перетаскивании объекта в документ
    // -но только если редактор виден, т.е. имеет положительную ширину и высоту
    this.$eventListener.on('dragenter', this.documentEventHandlers.onDragenter)
      .on('dragleave', this.documentEventHandlers.onDragleave)
      .on('drop', this.documentEventHandlers.onDrop);

    // изменить сообщение дропзоны при наведении.
    this.$dropzone.on('dragenter', () => {
      this.$dropzone.addClass('hover');
      $dropzoneMessage.text(this.lang.image.dropImage);
    }).on('dragleave', () => {
      this.$dropzone.removeClass('hover');
      $dropzoneMessage.text(this.lang.image.dragImageHere);
    });

    // прикрепить dropImage
    this.$dropzone.on('drop', (event) => {
      const dataTransfer = event.originalEvent.dataTransfer;

      // Остановите браузер от открытия отброшенного контента
      event.preventDefault();

      if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
        this.$editable.focus();
        this.context.invoke('editor.insertImagesOrCallback', dataTransfer.files);
      } else {
        $.each(dataTransfer.types, (idx, type) => {
          // пропустить типы, специфичные для moz
          if (type.toLowerCase().indexOf('_moz_') > -1) {
            return;
          }
          const content = dataTransfer.getData(type);

          if (type.toLowerCase().indexOf('text') > -1) {
            this.context.invoke('editor.pasteHTML', content);
          } else {
            $(content).each((idx, item) => {
              this.context.invoke('editor.insertNode', item);
            });
          }
        });
      }
    }).on('dragover', false); // Запретить событие перетаскивания по умолчанию
  }

  destroy() {
    Object.keys(this.documentEventHandlers).forEach((key) => {
      this.$eventListener.off(key.substr(2).toLowerCase(), this.documentEventHandlers[key]);
    });
    this.documentEventHandlers = {};
  }
}
