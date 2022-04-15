import lists from '../core/lists';

export default class Clipboard {
  constructor(context) {
    this.context = context;
    this.$editable = context.layoutInfo.editable;
  }

  initialize() {
    this.$editable.on('paste', this.pasteByEvent.bind(this));
  }

  /**
   * вставка по событию буфера обмена
   *
   * @param {Event} event
   */
  pasteByEvent(event) {
    const clipboardData = event.originalEvent.clipboardData;

    if (clipboardData && clipboardData.items && clipboardData.items.length) {
      const item = clipboardData.items.length > 1 ? clipboardData.items[1] : lists.head(clipboardData.items);
      if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
        // вставить файл img
        this.context.invoke('editor.insertImagesOrCallback', [item.getAsFile()]);
        event.preventDefault();
      } else if (item.kind === 'string') {
        // вставка текста с проверкой максимальной длины текста (maxTextLength)
        if (this.context.invoke('editor.isLimited', clipboardData.getData('Text').length)) {
          event.preventDefault();
        }
      }
    } else if (window.clipboardData) {
      // для IE
      let text = window.clipboardData.getData('text');
      if (this.context.invoke('editor.isLimited', text.length)) {
        event.preventDefault();
      }
    }
    // Вызов editor.afterCommand после выполнения обработчика событий по умолчанию
    setTimeout(() => {
      this.context.invoke('editor.afterCommand');
    }, 10);
  }
}
