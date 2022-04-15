import $ from 'jquery';
import env from './env';
import func from './func';
import lists from './lists';
import dom from './dom';

/**
 * возвращает borderPoint из TextRange, вдохновленный  Энди На HuskyRange.js
 *
 * @param {TextRange} textRange
 * @param {Boolean} isStart
 * @return {BoundaryPoint}
 *
 * @see http://msdn.microsoft.com/en-us/library/ie/ms535872(v=vs.85).aspx
 */
function textRangeToPoint(textRange, isStart) {
  let container = textRange.parentElement();
  let offset;

  const tester = document.body.createTextRange();
  let prevContainer;
  const childNodes = lists.from(container.childNodes);
  for (offset = 0; offset < childNodes.length; offset++) {
    if (dom.isText(childNodes[offset])) {
      continue;
    }
    tester.moveToElementText(childNodes[offset]);
    if (tester.compareEndPoints('StartToStart', textRange) >= 0) {
      break;
    }
    prevContainer = childNodes[offset];
  }

  if (offset !== 0 && dom.isText(childNodes[offset - 1])) {
    const textRangeStart = document.body.createTextRange();
    let curTextNode = null;
    textRangeStart.moveToElementText(prevContainer || container);
    textRangeStart.collapse(!prevContainer);
    curTextNode = prevContainer ? prevContainer.nextSibling : container.firstChild;

    const pointTester = textRange.duplicate();
    pointTester.setEndPoint('StartToStart', textRangeStart);
    let textCount = pointTester.text.replace(/[\r\n]/g, '').length;

    while (textCount > curTextNode.nodeValue.length && curTextNode.nextSibling) {
      textCount -= curTextNode.nodeValue.length;
      curTextNode = curTextNode.nextSibling;
    }

    // [обходной путь] заставить IE повторно ссылаться на curTextNode, взлом
    const dummy = curTextNode.nodeValue; // eslint-disable-line

    if (isStart && curTextNode.nextSibling && dom.isText(curTextNode.nextSibling) &&
      textCount === curTextNode.nodeValue.length) {
      textCount -= curTextNode.nodeValue.length;
      curTextNode = curTextNode.nextSibling;
    }

    container = curTextNode;
    offset = textCount;
  }

  return {
    cont: container,
    offset: offset,
  };
}

/**
 * возвращает TextRange из граничной точки (вдохновлено библиотекой google closure-library)
 * @param {BoundaryPoint} point
 * @return {TextRange}
 */
function pointToTextRange(point) {
  const textRangeInfo = function(container, offset) {
    let node, isCollapseToStart;

    if (dom.isText(container)) {
      const prevTextNodes = dom.listPrev(container, func.not(dom.isText));
      const prevContainer = lists.last(prevTextNodes).previousSibling;
      node = prevContainer || container.parentNode;
      offset += lists.sum(lists.tail(prevTextNodes), dom.nodeLength);
      isCollapseToStart = !prevContainer;
    } else {
      node = container.childNodes[offset] || container;
      if (dom.isText(node)) {
        return textRangeInfo(node, 0);
      }

      offset = 0;
      isCollapseToStart = false;
    }

    return {
      node: node,
      collapseToStart: isCollapseToStart,
      offset: offset,
    };
  };

  const textRange = document.body.createTextRange();
  const info = textRangeInfo(point.node, point.offset);

  textRange.moveToElementText(info.node);
  textRange.collapse(info.collapseToStart);
  textRange.moveStart('character', info.offset);
  return textRange;
}

/**
   * Диапазон обёртывания
   *
   * @constructor
   * @param {Node} sc - стартовый контейнер
   * @param {Number} so - начальное смещение
   * @param {Node} ec - конечный контейнер
   * @param {Number} eo - конечное смещение
   */
class WrappedRange {
  constructor(sc, so, ec, eo) {
    this.sc = sc;
    this.so = so;
    this.ec = ec;
    this.eo = eo;

    // isOnEditable: судить о том, является ли диапазон редактируемым или нет
    this.isOnEditable = this.makeIsOn(dom.isEditable);
    // isOnList: судить о том, находится ли диапазон в узле списка или нет
    this.isOnList = this.makeIsOn(dom.isList);
    // isOnAnchor: судить о том, находится ли диапазон на якорном узле или нет
    this.isOnAnchor = this.makeIsOn(dom.isAnchor);
    // isOnCell: определить, находится ли диапазон на узле ячейки или нет
    this.isOnCell = this.makeIsOn(dom.isCell);
    // isOnData: судить о том, находится ли диапазон на узле данных или нет
    this.isOnData = this.makeIsOn(dom.isData);
  }

  // nativeRange: получить nativeRange из sc, so, ec, eo
  nativeRange() {
    if (env.isW3CRangeSupport) {
      const w3cRange = document.createRange();
      w3cRange.setStart(this.sc, this.so);
      w3cRange.setEnd(this.ec, this.eo);

      return w3cRange;
    } else {
      const textRange = pointToTextRange({
        node: this.sc,
        offset: this.so,
      });

      textRange.setEndPoint('EndToEnd', pointToTextRange({
        node: this.ec,
        offset: this.eo,
      }));

      return textRange;
    }
  }

  getPoints() {
    return {
      sc: this.sc,
      so: this.so,
      ec: this.ec,
      eo: this.eo,
    };
  }

  getStartPoint() {
    return {
      node: this.sc,
      offset: this.so,
    };
  }

  getEndPoint() {
    return {
      node: this.ec,
      offset: this.eo,
    };
  }

  /**
   * выберите обновление видимого диапазона
   */
  select() {
    const nativeRng = this.nativeRange();
    if (env.isW3CRangeSupport) {
      const selection = document.getSelection();
      if (selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
      selection.addRange(nativeRng);
    } else {
      nativeRng.select();
    }

    return this;
  }

  /**
   * Перемещает полосу прокрутки к начальному контейнеру(ам) текущего диапазона
   *
   * @return {WrappedRange}
   */
  scrollIntoView(container) {
    const height = $(container).height();
    if (container.scrollTop + height < this.sc.offsetTop) {
      container.scrollTop += Math.abs(container.scrollTop + height - this.sc.offsetTop);
    }

    return this;
  }

  /**
   * @return {WrappedRange}
   */
  normalize() {
    /**
     * @param {BoundaryPoint} point
     * @param {Boolean} isLeftToRight - true: предпочитают выбирать правый узел
     *                                - false: предпочитают выбирать левый узел
     * @return {BoundaryPoint}
     */
    const getVisiblePoint = function(point, isLeftToRight) {
      if (!point) {
        return point;
      }

      // Просто используйте данный пункт [XXX:Adhoc].
      //  - case 01. если точка находится на середине узла
      //  - case 02. если точка находится на правом краю и предпочтительнее выбрать левый узел
      //  - case 03. если точка находится на левом краю и предпочитает выбрать правый узел
      //  - case 04. если точка находится на правом ребре и предпочитает выбрать правый узел, но узел не существует
      //  - case 05. если точка находится на левом ребре и предпочтительно выбрать левый узел, но узел не существует
      //  - case 06. если точка находится на блочном узле и не имеет детей
      if (dom.isVisiblePoint(point)) {
        if (!dom.isEdgePoint(point) ||
            (dom.isRightEdgePoint(point) && !isLeftToRight) ||
            (dom.isLeftEdgePoint(point) && isLeftToRight) ||
            (dom.isRightEdgePoint(point) && isLeftToRight && dom.isVoid(point.node.nextSibling)) ||
            (dom.isLeftEdgePoint(point) && !isLeftToRight && dom.isVoid(point.node.previousSibling)) ||
            (dom.isBlock(point.node) && dom.isEmpty(point.node))) {
          return point;
        }
      }

      // точка на краю блока
      const block = dom.ancestor(point.node, dom.isBlock);
      let hasRightNode = false;

      if (!hasRightNode) {
        const prevPoint = dom.prevPoint(point) || { node: null };
        hasRightNode = (dom.isLeftEdgePointOf(point, block) || dom.isVoid(prevPoint.node)) && !isLeftToRight;
      }

      let hasLeftNode = false;
      if (!hasLeftNode) {
        const nextPoint = dom.nextPoint(point) || { node: null };
        hasLeftNode = (dom.isRightEdgePointOf(point, block) || dom.isVoid(nextPoint.node)) && isLeftToRight;
      }

      if (hasRightNode || hasLeftNode) {
        // возвращает точку, которая уже находится на видимой точке
        if (dom.isVisiblePoint(point)) {
          return point;
        }
        // обратное направление
        isLeftToRight = !isLeftToRight;
      }

      const nextPoint = isLeftToRight ? dom.nextPointUntil(dom.nextPoint(point), dom.isVisiblePoint)
        : dom.prevPointUntil(dom.prevPoint(point), dom.isVisiblePoint);
      return nextPoint || point;
    };

    const endPoint = getVisiblePoint(this.getEndPoint(), false);
    const startPoint = this.isCollapsed() ? endPoint : getVisiblePoint(this.getStartPoint(), true);

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * возвращает совпадающие узлы по диапазону
   *
   * @param {Function} [pred] - функция предиката
   * @param {Object} [options]
   * @param {Boolean} [options.includeAncestor]
   * @param {Boolean} [options.fullyContains]
   * @return {Node[]}
   */
  nodes(pred, options) {
    pred = pred || func.ok;

    const includeAncestor = options && options.includeAncestor;
    const fullyContains = options && options.fullyContains;

    // TODO сравнивать баллы и сортировать
    const startPoint = this.getStartPoint();
    const endPoint = this.getEndPoint();

    const nodes = [];
    const leftEdgeNodes = [];

    dom.walkPoint(startPoint, endPoint, function(point) {
      if (dom.isEditable(point.node)) {
        return;
      }

      let node;
      if (fullyContains) {
        if (dom.isLeftEdgePoint(point)) {
          leftEdgeNodes.push(point.node);
        }
        if (dom.isRightEdgePoint(point) && lists.contains(leftEdgeNodes, point.node)) {
          node = point.node;
        }
      } else if (includeAncestor) {
        node = dom.ancestor(point.node, pred);
      } else {
        node = point.node;
      }

      if (node && pred(node)) {
        nodes.push(node);
      }
    }, true);

    return lists.unique(nodes);
  }

  /**
   * возвращает общий предок диапазона
   * @return {Element} - commonAncestor
   */
  commonAncestor() {
    return dom.commonAncestor(this.sc, this.ec);
  }

  /**
   * Возвращает диапазон расширений по умолчанию 
   *
   * @param {Function} pred - функция предикатов 
   * @return {WrappedRange}
   */
  expand(pred) {
    const startAncestor = dom.ancestor(this.sc, pred);
    const endAncestor = dom.ancestor(this.ec, pred);

    if (!startAncestor && !endAncestor) {
      return new WrappedRange(this.sc, this.so, this.ec, this.eo);
    }

    const boundaryPoints = this.getPoints();

    if (startAncestor) {
      boundaryPoints.sc = startAncestor;
      boundaryPoints.so = 0;
    }

    if (endAncestor) {
      boundaryPoints.ec = endAncestor;
      boundaryPoints.eo = dom.nodeLength(endAncestor);
    }

    return new WrappedRange(
      boundaryPoints.sc,
      boundaryPoints.so,
      boundaryPoints.ec,
      boundaryPoints.eo
    );
  }

  /**
   * @param {Boolean} isCollapseToStart
   * @return {WrappedRange}
   */
  collapse(isCollapseToStart) {
    if (isCollapseToStart) {
      return new WrappedRange(this.sc, this.so, this.sc, this.so);
    } else {
      return new WrappedRange(this.ec, this.eo, this.ec, this.eo);
    }
  }

  /**
   * разделить текст по диапазону 
   */
  splitText() {
    const isSameContainer = this.sc === this.ec;
    const boundaryPoints = this.getPoints();

    if (dom.isText(this.ec) && !dom.isEdgePoint(this.getEndPoint())) {
      this.ec.splitText(this.eo);
    }

    if (dom.isText(this.sc) && !dom.isEdgePoint(this.getStartPoint())) {
      boundaryPoints.sc = this.sc.splitText(this.so);
      boundaryPoints.so = 0;

      if (isSameContainer) {
        boundaryPoints.ec = boundaryPoints.sc;
        boundaryPoints.eo = this.eo - this.so;
      }
    }

    return new WrappedRange(
      boundaryPoints.sc,
      boundaryPoints.so,
      boundaryPoints.ec,
      boundaryPoints.eo
    );
  }

  /**
   * Удалить содержимое диапазона 
   * @return {WrappedRange}
   */
  deleteContents() {
    if (this.isCollapsed()) {
      return this;
    }

    const rng = this.splitText();
    const nodes = rng.nodes(null, {
      fullyContains: true,
    });

    // поиск новых световых точек 
    const point = dom.prevPointUntil(rng.getStartPoint(), function(point) {
      return !lists.contains(nodes, point.node);
    });

    const emptyParents = [];
    $.each(nodes, function(idx, node) {
      // найти родителей 
      const parent = node.parentNode;
      if (point.node !== parent && dom.nodeLength(parent) === 1) {
        emptyParents.push(parent);
      }
      dom.remove(node, false);
    });

    // удалить пустых родителей
    $.each(emptyParents, function(idx, node) {
      dom.remove(node, false);
    });

    return new WrappedRange(
      point.node,
      point.offset,
      point.node,
      point.offset
    ).normalize();
  }

  /**
   * makeIsOn: функция return isOn(pred)
   */
  makeIsOn(pred) {
    return function() {
      const ancestor = dom.ancestor(this.sc, pred);
      return !!ancestor && (ancestor === dom.ancestor(this.ec, pred));
    };
  }

  /**
   * @param {Function} pred
   * @return {Boolean}
   */
  isLeftEdgeOf(pred) {
    if (!dom.isLeftEdgePoint(this.getStartPoint())) {
      return false;
    }

    const node = dom.ancestor(this.sc, pred);
    return node && dom.isLeftEdgeOf(this.sc, node);
  }

  /**
   * возвращает, был ли диапазон свернут или нет
   */
  isCollapsed() {
    return this.sc === this.ec && this.so === this.eo;
  }

  /**
   * обернуть инлайн-узлы, которые являются дочерними элементами body, абзацем
   *
   * @return {WrappedRange}
   */
  wrapBodyInlineWithPara() {
    if (dom.isBodyContainer(this.sc) && dom.isEmpty(this.sc)) {
      this.sc.innerHTML = dom.emptyPara;
      return new WrappedRange(this.sc.firstChild, 0, this.sc.firstChild, 0);
    }

    /**
     * [обходной путь] firefox часто создает диапазон на невидимой точке. так что нормализуйте здесь.
     *  - firefox: |<p>text</p>|
     *  - chrome: <p>|text|</p>
     */
    const rng = this.normalize();
    if (dom.isParaInline(this.sc) || dom.isPara(this.sc)) {
      return rng;
    }

    // найти встроенный верхний предок
    let topAncestor;
    if (dom.isInline(rng.sc)) {
      const ancestors = dom.listAncestor(rng.sc, func.not(dom.isInline));
      topAncestor = lists.last(ancestors);
      if (!dom.isInline(topAncestor)) {
        topAncestor = ancestors[ancestors.length - 2] || rng.sc.childNodes[rng.so];
      }
    } else {
      topAncestor = rng.sc.childNodes[rng.so > 0 ? rng.so - 1 : 0];
    }

    if (topAncestor) {
      // братья и сёстры не в параграфе
      let inlineSiblings = dom.listPrev(topAncestor, dom.isParaInline).reverse();
      inlineSiblings = inlineSiblings.concat(dom.listNext(topAncestor.nextSibling, dom.isParaInline));

      // обернуть абзацем
      if (inlineSiblings.length) {
        const para = dom.wrap(lists.head(inlineSiblings), 'p');
        dom.appendChildNodes(para, lists.tail(inlineSiblings));
      }
    }

    return this.normalize();
  }

  /**
   * вставить узел в текущий курсор
   *
   * @param {Node} node
   * @return {Node}
   */
  insertNode(node) {
    let rng = this;

    if (dom.isText(node) || dom.isInline(node)) {
      rng = this.wrapBodyInlineWithPara().deleteContents();
    }

    const info = dom.splitPoint(rng.getStartPoint(), dom.isInline(node));
    if (info.rightNode) {
      info.rightNode.parentNode.insertBefore(node, info.rightNode);
      if (dom.isEmpty(info.rightNode) && dom.isPara(node)) {
        info.rightNode.parentNode.removeChild(info.rightNode);
      }
    } else {
      info.container.appendChild(node);
    }

    return node;
  }

  /**
   * вставить html в текущий курсор
   */
  pasteHTML(markup) {
    markup = $.trim(markup);

    const contentsContainer = $('<div></div>').html(markup)[0];
    let childNodes = lists.from(contentsContainer.childNodes);

    // const rng = this.wrapBodyInlineWithPara().deleteContents();
    const rng = this;
    let reversed = false;

    if (rng.so >= 0) {
      childNodes = childNodes.reverse();
      reversed = true;
    }

    childNodes = childNodes.map(function(childNode) {
      return rng.insertNode(childNode);
    });

    if (reversed) {
      childNodes = childNodes.reverse();
    }
    return childNodes;
  }

  /**
   * возвращает текст в диапазоне
   *
   * @return {String}
   */
  toString() {
    const nativeRng = this.nativeRange();
    return env.isW3CRangeSupport ? nativeRng.toString() : nativeRng.text;
  }

  /**
   * возвращает диапазон для слова перед курсором
   *
   * @param {Boolean} [findAfter] - найти после курсора, default: false
   * @return {WrappedRange}
   */
  getWordRange(findAfter) {
    let endPoint = this.getEndPoint();

    if (!dom.isCharPoint(endPoint)) {
      return this;
    }

    const startPoint = dom.prevPointUntil(endPoint, function(point) {
      return !dom.isCharPoint(point);
    });

    if (findAfter) {
      endPoint = dom.nextPointUntil(endPoint, function(point) {
        return !dom.isCharPoint(point);
      });
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * возвращает диапазон для слов перед курсором
   *
   * @param {Boolean} [findAfter] - найти после курсора, default: false
   * @return {WrappedRange}
   */
  getWordsRange(findAfter) {
    var endPoint = this.getEndPoint();

    var isNotTextPoint = function(point) {
      return !dom.isCharPoint(point) && !dom.isSpacePoint(point);
    };

    if (isNotTextPoint(endPoint)) {
      return this;
    }

    var startPoint = dom.prevPointUntil(endPoint, isNotTextPoint);

    if (findAfter) {
      endPoint = dom.nextPointUntil(endPoint, isNotTextPoint);
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * возвращает диапазон для слов перед курсором, которые совпадают с Regex
   *
   * example:
   *  range: 'hi @Peter Pan'
   *  regex: '/@[a-z ]+/i'
   *  return range: '@Peter Pan'
   *
   * @param {RegExp} [regex]
   * @return {WrappedRange|null}
   */
  getWordsMatchRange(regex) {
    var endPoint = this.getEndPoint();

    var startPoint = dom.prevPointUntil(endPoint, function(point) {
      if (!dom.isCharPoint(point) && !dom.isSpacePoint(point)) {
        return true;
      }
      var rng = new WrappedRange(
        point.node,
        point.offset,
        endPoint.node,
        endPoint.offset
      );
      var result = regex.exec(rng.toString());
      return result && result.index === 0;
    });

    var rng = new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );

    var text = rng.toString();
    var result = regex.exec(text);

    if (result && result[0].length === text.length) {
      return rng;
    } else {
      return null;
    }
  }

  /**
   * создать закладку offsetPath
   *
   * @param {Node} editable
   */
  bookmark(editable) {
    return {
      s: {
        path: dom.makeOffsetPath(editable, this.sc),
        offset: this.so,
      },
      e: {
        path: dom.makeOffsetPath(editable, this.ec),
        offset: this.eo,
      },
    };
  }

  /**
   * создать закладку OffsetPath на основе абзаца
   *
   * @param {Node[]} paras
   */
  paraBookmark(paras) {
    return {
      s: {
        path: lists.tail(dom.makeOffsetPath(lists.head(paras), this.sc)),
        offset: this.so,
      },
      e: {
        path: lists.tail(dom.makeOffsetPath(lists.last(paras), this.ec)),
        offset: this.eo,
      },
    };
  }

  /**
   * getClientRects
   * @return {Rect[]}
   */
  getClientRects() {
    const nativeRng = this.nativeRange();
    return nativeRng.getClientRects();
  }
}

/**
 * Структура данных
 *  * BoundaryPoint: точка дерева dom
 *  * BoundaryPoints: две граничные точки, соответствующие началу и концу диапазона
 *
 * См. http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Position
 */
export default {
  /**
   * создание объекта Range из аргументов или выбора браузера
   *
   * @param {Node} sc - стартовый контейнер
   * @param {Number} so - начальное смещение
   * @param {Node} ec - конечный контейнер
   * @param {Number} eo - конечное смещение
   * @return {WrappedRange}
   */
  create: function(sc, so, ec, eo) {
    if (arguments.length === 4) {
      return new WrappedRange(sc, so, ec, eo);
    } else if (arguments.length === 2) { // обрушился
      ec = sc;
      eo = so;
      return new WrappedRange(sc, so, ec, eo);
    } else {
      let wrappedRange = this.createFromSelection();

      if (!wrappedRange && arguments.length === 1) {
        let bodyElement = arguments[0];
        if (dom.isEditable(bodyElement)) {
          bodyElement = bodyElement.lastChild;
        }
        return this.createFromBodyElement(bodyElement, dom.emptyPara === arguments[0].innerHTML);
      }
      return wrappedRange;
    }
  },

  createFromBodyElement: function(bodyElement, isCollapseToStart = false) {
    var wrappedRange = this.createFromNode(bodyElement);
    return wrappedRange.collapse(isCollapseToStart);
  },

  createFromSelection: function() {
    let sc, so, ec, eo;
    if (env.isW3CRangeSupport) {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      } else if (dom.isBody(selection.anchorNode)) {
        // Firefox: возвращает всё тело как диапазон при инициализации.
        // Нам это никогда не понадобится.
        return null;
      }

      const nativeRng = selection.getRangeAt(0);
      sc = nativeRng.startContainer;
      so = nativeRng.startOffset;
      ec = nativeRng.endContainer;
      eo = nativeRng.endOffset;
    } else { // IE8: TextRange
      const textRange = document.selection.createRange();
      const textRangeEnd = textRange.duplicate();
      textRangeEnd.collapse(false);
      const textRangeStart = textRange;
      textRangeStart.collapse(true);

      let startPoint = textRangeToPoint(textRangeStart, true);
      let endPoint = textRangeToPoint(textRangeEnd, false);

      // тот же видимый точечный корпус: диапазон был разрушен.
      if (dom.isText(startPoint.node) && dom.isLeftEdgePoint(startPoint) &&
        dom.isTextNode(endPoint.node) && dom.isRightEdgePoint(endPoint) &&
        endPoint.node.nextSibling === startPoint.node) {
        startPoint = endPoint;
      }

      sc = startPoint.cont;
      so = startPoint.offset;
      ec = endPoint.cont;
      eo = endPoint.offset;
    }

    return new WrappedRange(sc, so, ec, eo);
  },

  /**
   * @method
   *
   * создать WrappedRange из узла
   *
   * @param {Node} node
   * @return {WrappedRange}
   */
  createFromNode: function(node) {
    let sc = node;
    let so = 0;
    let ec = node;
    let eo = dom.nodeLength(ec);

    // Браузеры не могут нацеливаться на изображение или узел пустоты
    if (dom.isVoid(sc)) {
      so = dom.listPrev(sc).length - 1;
      sc = sc.parentNode;
    }
    if (dom.isBR(ec)) {
      eo = dom.listPrev(ec).length - 1;
      ec = ec.parentNode;
    } else if (dom.isVoid(ec)) {
      eo = dom.listPrev(ec).length;
      ec = ec.parentNode;
    }

    return this.create(sc, so, ec, eo);
  },

  /**
   * создать WrappedRange из узла после позиции
   *
   * @param {Node} node
   * @return {WrappedRange}
   */
  createFromNodeBefore: function(node) {
    return this.createFromNode(node).collapse(true);
  },

  /**
   * создать WrappedRange из узла после позиции
   *
   * @param {Node} node
   * @return {WrappedRange}
   */
  createFromNodeAfter: function(node) {
    return this.createFromNode(node).collapse();
  },

  /**
   * @method
   *
   * создать WrappedRange из закладки
   *
   * @param {Node} editable
   * @param {Object} bookmark
   * @return {WrappedRange}
   */
  createFromBookmark: function(editable, bookmark) {
    const sc = dom.fromOffsetPath(editable, bookmark.s.path);
    const so = bookmark.s.offset;
    const ec = dom.fromOffsetPath(editable, bookmark.e.path);
    const eo = bookmark.e.offset;
    return new WrappedRange(sc, so, ec, eo);
  },

  /**
   * @method
   *
   * создать WrappedRange из paraBookmark
   *
   * @param {Object} bookmark
   * @param {Node[]} paras
   * @return {WrappedRange}
   */
  createFromParaBookmark: function(bookmark, paras) {
    const so = bookmark.s.offset;
    const eo = bookmark.e.offset;
    const sc = dom.fromOffsetPath(lists.head(paras), bookmark.s.path);
    const ec = dom.fromOffsetPath(lists.last(paras), bookmark.e.path);

    return new WrappedRange(sc, so, ec, eo);
  },
};
