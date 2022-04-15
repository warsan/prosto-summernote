import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import dom from '../core/dom';

export default class Style {
  /**
   * @method jQueryCSS
   *
   * [workaround] для старого jQuery
   * передача массива свойств стиля в .css()
   * приведет к объекту, состоящему из пар "свойство-значение".
   * (совместимость с версией < 1.9)
   *
   * @private
   * @param  {jQuery} $obj
   * @param  {Array} propertyNames - Массив из одного или нескольких свойств CSS.
   * @return {Object}
   */
  jQueryCSS($obj, propertyNames) {
    const result = {};
    $.each(propertyNames, (idx, propertyName) => {
      result[propertyName] = $obj.css(propertyName);
    });
    return result;
  }

  /**
   * возвращает объект стиля из узла
   *
   * @param {jQuery} $node
   * @return {Object}
   */
  fromNode($node) {
    const properties = ['font-family', 'font-size', 'text-align', 'list-style-type', 'line-height'];
    const styleInfo = this.jQueryCSS($node, properties) || {};

    const fontSize = $node[0].style.fontSize || styleInfo['font-size'];

    styleInfo['font-size'] = parseInt(fontSize, 10);
    styleInfo['font-size-unit'] = fontSize.match(/[a-z%]+$/);

    return styleInfo;
  }

  /**
   * стиль уровня абзаца
   *
   * @param {WrappedRange} rng
   * @param {Object} styleInfo
   */
  stylePara(rng, styleInfo) {
    $.each(rng.nodes(dom.isPara, {
      includeAncestor: true,
    }), (idx, para) => {
      $(para).css(styleInfo);
    });
  }

  /**
   * вставляет и возвращает styleNodes на диапазон.
   *
   * @param {WrappedRange} rng
   * @param {Object} [options] - опции для styleNodes
   * @param {String} [options.nodeName] - default: `SPAN`
   * @param {Boolean} [options.expandClosestSibling] - default: `false`
   * @param {Boolean} [options.onlyPartialContains] - default: `false`
   * @return {Node[]}
   */
  styleNodes(rng, options) {
    rng = rng.splitText();

    const nodeName = (options && options.nodeName) || 'SPAN';
    const expandClosestSibling = !!(options && options.expandClosestSibling);
    const onlyPartialContains = !!(options && options.onlyPartialContains);

    if (rng.isCollapsed()) {
      return [rng.insertNode(dom.create(nodeName))];
    }

    let pred = dom.makePredByNodeName(nodeName);
    const nodes = rng.nodes(dom.isText, {
      fullyContains: true,
    }).map((text) => {
      return dom.singleChildAncestor(text, pred) || dom.wrap(text, nodeName);
    });

    if (expandClosestSibling) {
      if (onlyPartialContains) {
        const nodesInRange = rng.nodes();
        // составной с частичным содержит предикацию
        pred = func.and(pred, (node) => {
          return lists.contains(nodesInRange, node);
        });
      }

      return nodes.map((node) => {
        const siblings = dom.withClosestSiblings(node, pred);
        const head = lists.head(siblings);
        const tails = lists.tail(siblings);
        $.each(tails, (idx, elem) => {
          dom.appendChildNodes(head, elem.childNodes);
          dom.remove(elem);
        });
        return lists.head(siblings);
      });
    } else {
      return nodes;
    }
  }

  /**
   * получить текущий стиль на курсоре
   *
   * @param {WrappedRange} rng
   * @return {Object} - объект содержит свойства стиля.
   */
  current(rng) {
    const $cont = $(!dom.isElement(rng.sc) ? rng.sc.parentNode : rng.sc);
    let styleInfo = this.fromNode($cont);

    // document.queryCommandState для состояния переключения
    // [обходной путь] предотвратить Firefox nsresult: "0x80004005 (NS_ERROR_FAILURE)"
    try {
      styleInfo = $.extend(styleInfo, {
        'font-bold': document.queryCommandState('bold') ? 'bold' : 'normal',
        'font-italic': document.queryCommandState('italic') ? 'italic' : 'normal',
        'font-underline': document.queryCommandState('underline') ? 'underline' : 'normal',
        'font-subscript': document.queryCommandState('subscript') ? 'subscript' : 'normal',
        'font-superscript': document.queryCommandState('superscript') ? 'superscript' : 'normal',
        'font-strikethrough': document.queryCommandState('strikethrough') ? 'strikethrough' : 'normal',
        'font-family': document.queryCommandValue('fontname') || styleInfo['font-family'],
      });
    } catch (e) {
      // eslint-disable-next-line
    }

    // list-style-type to list-style(unordered, ordered)
    if (!rng.isOnList()) {
      styleInfo['list-style'] = 'none';
    } else {
      const orderedTypes = ['circle', 'disc', 'disc-leading-zero', 'square'];
      const isUnordered = orderedTypes.indexOf(styleInfo['list-style-type']) > -1;
      styleInfo['list-style'] = isUnordered ? 'unordered' : 'ordered';
    }

    const para = dom.ancestor(rng.sc, dom.isPara);
    if (para && para.style['line-height']) {
      styleInfo['line-height'] = para.style.lineHeight;
    } else {
      const lineHeight = parseInt(styleInfo['line-height'], 10) / parseInt(styleInfo['font-size'], 10);
      styleInfo['line-height'] = lineHeight.toFixed(1);
    }

    styleInfo.anchor = rng.isOnAnchor() && dom.ancestor(rng.sc, dom.isAnchor);
    styleInfo.ancestors = dom.listAncestor(rng.sc, dom.isEditable);
    styleInfo.range = rng;

    return styleInfo;
  }
}
