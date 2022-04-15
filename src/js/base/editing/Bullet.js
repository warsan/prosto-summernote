import $ from 'jquery';
import lists from '../core/lists';
import func from '../core/func';
import dom from '../core/dom';
import range from '../core/range';

export default class Bullet {
  /**
   * переключение упорядоченного списка
   */
  insertOrderedList(editable) {
    this.toggleList('OL', editable);
  }

  /**
   * переключить неупорядоченный список
   */
  insertUnorderedList(editable) {
    this.toggleList('UL', editable);
  }

  /**
   * отступ
   */
  indent(editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    const paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, func.peq2('parentNode'));

    $.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        const previousList = this.findList(head.previousSibling);
        if (previousList) {
          paras
            .map(para => previousList.appendChild(para));
        } else {
          this.wrapList(paras, head.parentNode.nodeName);
          paras
            .map((para) => para.parentNode)
            .map((para) => this.appendToPrevious(para));
        }
      } else {
        $.each(paras, (idx, para) => {
          $(para).css('marginLeft', (idx, val) => {
            return (parseInt(val, 10) || 0) + 25;
          });
        });
      }
    });

    rng.select();
  }

  /**
   * наружу
   */
  outdent(editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    const paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, func.peq2('parentNode'));

    $.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        this.releaseList([paras]);
      } else {
        $.each(paras, (idx, para) => {
          $(para).css('marginLeft', (idx, val) => {
            val = (parseInt(val, 10) || 0);
            return val > 25 ? val - 25 : '';
          });
        });
      }
    });

    rng.select();
  }

  /**
   * переключение списка
   *
   * @param {String} listName - OL или UL
   */
  toggleList(listName, editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    let paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const bookmark = rng.paraBookmark(paras);
    const clustereds = lists.clusterBy(paras, func.peq2('parentNode'));

    // абзац к списку
    if (lists.find(paras, dom.isPurePara)) {
      let wrappedParas = [];
      $.each(clustereds, (idx, paras) => {
        wrappedParas = wrappedParas.concat(this.wrapList(paras, listName));
      });
      paras = wrappedParas;
    // список в абзац или изменить стиль списка
    } else {
      const diffLists = rng.nodes(dom.isList, {
        includeAncestor: true,
      }).filter((listNode) => {
        return !$.nodeName(listNode, listName);
      });

      if (diffLists.length) {
        $.each(diffLists, (idx, listNode) => {
          dom.replace(listNode, listName);
        });
      } else {
        paras = this.releaseList(clustereds, true);
      }
    }

    range.createFromParaBookmark(bookmark, paras).select();
  }

  /**
   * @param {Node[]} paras
   * @param {String} listName
   * @return {Node[]}
   */
  wrapList(paras, listName) {
    const head = lists.head(paras);
    const last = lists.last(paras);

    const prevList = dom.isList(head.previousSibling) && head.previousSibling;
    const nextList = dom.isList(last.nextSibling) && last.nextSibling;

    const listNode = prevList || dom.insertAfter(dom.create(listName || 'UL'), last);

    // P to LI
    paras = paras.map((para) => {
      return dom.isPurePara(para) ? dom.replace(para, 'LI') : para;
    });

    // добавить в список(<ul>, <ol>)
    dom.appendChildNodes(listNode, paras);

    if (nextList) {
      dom.appendChildNodes(listNode, lists.from(nextList.childNodes));
      dom.remove(nextList);
    }

    return paras;
  }

  /**
   * @method releaseList
   *
   * @param {Array[]} clustereds
   * @param {Boolean} isEscapseToBody
   * @return {Node[]}
   */
  releaseList(clustereds, isEscapseToBody) {
    let releasedParas = [];

    $.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      const last = lists.last(paras);

      const headList = isEscapseToBody ? dom.lastAncestor(head, dom.isList) : head.parentNode;
      const parentItem = headList.parentNode;

      if (headList.parentNode.nodeName === 'LI') {
        paras.map(para => {
          const newList = this.findNextSiblings(para);

          if (parentItem.nextSibling) {
            parentItem.parentNode.insertBefore(
              para,
              parentItem.nextSibling
            );
          } else {
            parentItem.parentNode.appendChild(para);
          }

          if (newList.length) {
            this.wrapList(newList, headList.nodeName);
            para.appendChild(newList[0].parentNode);
          }
        });

        if (headList.children.length === 0) {
          parentItem.removeChild(headList);
        }

        if (parentItem.childNodes.length === 0) {
          parentItem.parentNode.removeChild(parentItem);
        }
      } else {
        const lastList = headList.childNodes.length > 1 ? dom.splitTree(headList, {
          node: last.parentNode,
          offset: dom.position(last) + 1,
        }, {
          isSkipPaddingBlankHTML: true,
        }) : null;

        const middleList = dom.splitTree(headList, {
          node: head.parentNode,
          offset: dom.position(head),
        }, {
          isSkipPaddingBlankHTML: true,
        });

        paras = isEscapseToBody ? dom.listDescendant(middleList, dom.isLi)
          : lists.from(middleList.childNodes).filter(dom.isLi);

        // LI to P
        if (isEscapseToBody || !dom.isList(headList.parentNode)) {
          paras = paras.map((para) => {
            return dom.replace(para, 'P');
          });
        }

        $.each(lists.from(paras).reverse(), (idx, para) => {
          dom.insertAfter(para, headList);
        });

        // remove empty lists
        const rootLists = lists.compact([headList, middleList, lastList]);
        $.each(rootLists, (idx, rootList) => {
          const listNodes = [rootList].concat(dom.listDescendant(rootList, dom.isList));
          $.each(listNodes.reverse(), (idx, listNode) => {
            if (!dom.nodeLength(listNode)) {
              dom.remove(listNode, true);
            }
          });
        });
      }

      releasedParas = releasedParas.concat(paras);
    });

    return releasedParas;
  }

  /**
   * @method appendToPrevious
   * Добавляет список к предыдущему элементу списка, 
   * если не существует, 
   * то список заворачивается в новый элемент списка.
   *
   * @param {HTMLNode} ListItem
   * @return {HTMLNode}
   */
  appendToPrevious(node) {
    return node.previousSibling
      ? dom.appendChildNodes(node.previousSibling, [node])
      : this.wrapList([node], 'LI');
  }

  /**
   * @method findList
   *
   * 
   *
   * @param {HTMLNode} ListItem
   * @return {Array[]}
   */
  findList(node) {
    return node
      ? lists.find(node.children, child => ['OL', 'UL'].indexOf(child.nodeName) > -1)
      : null;
  }

  /**
   * @method findNextSiblings
   *
   * Находит все братья и сестры элемента списка, которые следуют за ним
   *
   * @param {HTMLNode} ListItem
   * @return {HTMLNode}
   */
  findNextSiblings(node) {
    const siblings = [];
    while (node.nextSibling) {
      siblings.push(node.nextSibling);
      node = node.nextSibling;
    }
    return siblings;
  }
}
