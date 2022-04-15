import $ from "jquery";
import dom from "../core/dom";
import range from "../core/range";
import Bullet from "../editing/Bullet";

/**
 * @class editing.Typing
 *
 * Типирование
 *
 */
export default class Typing {
  constructor(context) {
    // экземпляр Bullet для отключения списков
    this.bullet = new Bullet();
    this.options = context.options;
  }

  /**
   * вкладка для вставки
   *
   * @param {WrappedRange} rng
   * @param {Number} tabsize
   */
  insertTab(rng, tabsize) {
    const tab = dom.createText(new Array(tabsize + 1).join(dom.NBSP_CHAR));
    rng = rng.deleteContents();
    rng.insertNode(tab, true);

    rng = range.create(tab, tabsize);
    rng.select();
  }

  /**
   * вставить абзац
   *
   * @param {jQuery} $editable
   * @param {WrappedRange} rng Может использоваться в модульных тестах для "издевательства". диапазон
   *
   * blockquoteBreakingLevel
   *   0 - Без разрыва, новый абзац остается внутри цитаты
   *   1 - Разорвать первую блок-цитату в списке предков
   *   2 - Разорвать все блочные кавычки, чтобы новый абзац не заключался в кавычки (это значение по умолчанию)
   */
  insertParagraph(editable, rng) {
    rng = rng || range.create(editable);

    // deleteContents on range.
    rng = rng.deleteContents();

    // Оберните диапазон, если он должен быть обёрнут абзацем
    rng = rng.wrapBodyInlineWithPara();

    // пункт заключения
    const splitRoot = dom.ancestor(rng.sc, dom.isPara);

    let nextPara;
    // на абзац: разделить абзац
    if (splitRoot) {
      // если это пустая строка с li
      if (
        dom.isLi(splitRoot) &&
        (dom.isEmpty(splitRoot) || dom.deepestChildIsEmpty(splitRoot))
      ) {
        // переключение UL/OL и выход
        this.bullet.toggleList(splitRoot.parentNode.nodeName);
        return;
      } else {
        let blockquote = null;
        if (this.options.blockquoteBreakingLevel === 1) {
          blockquote = dom.ancestor(splitRoot, dom.isBlockquote);
        } else if (this.options.blockquoteBreakingLevel === 2) {
          blockquote = dom.lastAncestor(splitRoot, dom.isBlockquote);
        }

        if (blockquote) {
          // Мы находимся внутри блочной цитаты, и опции просят нас разорвать её
          nextPara = $(dom.emptyPara)[0];
          // Если разделение находится прямо перед <br>, удалите его, чтобы не было "пустой строки".
          // после разделения в новой блок-цитате, созданной
          if (
            dom.isRightEdgePoint(rng.getStartPoint()) &&
            dom.isBR(rng.sc.nextSibling)
          ) {
            $(rng.sc.nextSibling).remove();
          }
          const split = dom.splitTree(blockquote, rng.getStartPoint(), {  isDiscardEmptySplits: true,
          });
          if (split) {
            split.parentNode.insertBefore(nextPara, split);
          } else {
            dom.insertAfter(nextPara, blockquote); // Нет разделения, если мы находимся в конце блок-цитаты.
          }
        } else {
          nextPara = dom.splitTree(splitRoot, rng.getStartPoint());

          // не блочная цитата, просто вставьте абзац
          let emptyAnchors = dom.listDescendant(splitRoot, dom.isEmptyAnchor);
          emptyAnchors = emptyAnchors.concat(
            dom.listDescendant(nextPara, dom.isEmptyAnchor)
          );

          $.each(emptyAnchors, (idx, anchor) => {
            dom.remove(anchor);
          });

          // заменить пустой заголовок, предварительный или пользовательский styleTag на тег P
          if (
            (dom.isHeading(nextPara) ||
              dom.isPre(nextPara) ||
              dom.isCustomStyleTag(nextPara)) &&
            dom.isEmpty(nextPara)
          ) {
            nextPara = dom.replace(nextPara, "p");
          }
        }
      }
      // без абзаца: вставить пустой абзац
    } else {
      const next = rng.sc.childNodes[rng.so];
      nextPara = $(dom.emptyPara)[0];
      if (next) {
        rng.sc.insertBefore(nextPara, next);
      } else {
        rng.sc.appendChild(nextPara);
      }
    }

    range.create(nextPara, 0).normalize().select().scrollIntoView(editable);
  }
}
