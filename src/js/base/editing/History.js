import range from '../core/range';

export default class History {
  constructor(context) {
    this.stack = [];
    this.stackOffset = -1;
    this.context = context;
    this.$editable = context.layoutInfo.editable;
    this.editable = this.$editable[0];
  }

  makeSnapshot() {
    const rng = range.create(this.editable);
    const emptyBookmark = { s: { path: [], offset: 0 }, e: { path: [], offset: 0 } };

    return {
      contents: this.$editable.html(),
      bookmark: ((rng && rng.isOnEditable()) ? rng.bookmark(this.editable) : emptyBookmark),
    };
  }

  applySnapshot(snapshot) {
    if (snapshot.contents !== null) {
      this.$editable.html(snapshot.contents);
    }
    if (snapshot.bookmark !== null) {
      range.createFromBookmark(this.editable, snapshot.bookmark).select();
    }
  }

  /**
  * @method rewind
  * Перемотка стёка истории назад к первому сделанному снимку.
  * Оставляет стёк нетронутым, так что "Redo" всё ещё можно использовать.
  */
  rewind() {
    // Создайте моментальный снимок, если он ещё не записан
    if (this.$editable.html() !== this.stack[this.stackOffset].contents) {
      this.recordUndo();
    }

    // Возврат к первому доступному снимку.
    this.stackOffset = 0;

    // Примените этот снимок.
    this.applySnapshot(this.stack[this.stackOffset]);
  }

  /**
  *  @method commit
  *  Сбрасывает стёк истории, но сохраняет содержимое текущего редактора.
  */
  commit() {
    // Очистите стек.
    this.stack = [];

    // Восстановление исходного значения stackOffset.
    this.stackOffset = -1;

    // Записываем наш первый снимок (из ничего).
    this.recordUndo();
  }

  /**
  * @method reset
  * Полностью сбрасывает стёк истории; возврат к пустому редактору.
  */
  reset() {
    // Очистите стёк.
    this.stack = [];

    // Восстановление исходного значения stackOffset.
    this.stackOffset = -1;

    // Очистите редактируемую область.
    this.$editable.html('');

    // Записываем наш первый снимок (из ничего).
    this.recordUndo();
  }

  /**
   * undo
   */
  undo() {
    // Создайте моментальный снимок, если он ещё не записан
    if (this.$editable.html() !== this.stack[this.stackOffset].contents) {
      this.recordUndo();
    }

    if (this.stackOffset > 0) {
      this.stackOffset--;
      this.applySnapshot(this.stack[this.stackOffset]);
    }
  }

  /**
   * переделать
   */
  redo() {
    if (this.stack.length - 1 > this.stackOffset) {
      this.stackOffset++;
      this.applySnapshot(this.stack[this.stackOffset]);
    }
  }

  /**
   * записанная отмена
   */
  recordUndo() {
    this.stackOffset++;

    // Вымывание стёка после смещения стёка (stackOffset)
    if (this.stack.length > this.stackOffset) {
      this.stack = this.stack.slice(0, this.stackOffset);
    }

    // Создайте новый снимок и переместите его в конец
    this.stack.push(this.makeSnapshot());

    // Если размер стёка достигает предела, то разрежьте его на части
    if (this.stack.length > this.context.options.historyLimit) {
      this.stack.shift();
      this.stackOffset -= 1;
    }
  }
}
