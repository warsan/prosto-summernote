import $ from 'jquery';
import dom from '../core/dom';
import range from '../core/range';
import lists from '../core/lists';

/**
 * @class Создайте виртуальный стол, чтобы определить, какие действия необходимо предпринять при изменении.
 * @param {object} startPoint Ячейка, выбранная для применения изменений.
 * @param {enum} where  Где будет применено изменение Строка или столбец. Используйте перечисление: TableResultAction.where
 * @param {enum} action Действие должно быть применено. Используйте перечисление: TableResultAction.requestAction
 * @param {object} domTable Dom элемент таблицы для внесения изменений.
 */
const TableResultAction = function(startPoint, where, action, domTable) {
  const _startPoint = { 'colPos': 0, 'rowPos': 0 };
  const _virtualTable = [];
  const _actionCellList = [];

  /// ///////////////////////////////////////////
  // Частные функции
  /// ///////////////////////////////////////////

  /**
   * Установите начальную точку действия.
   */
  function setStartPoint() {
    if (!startPoint || !startPoint.tagName || (startPoint.tagName.toLowerCase() !== 'td' && startPoint.tagName.toLowerCase() !== 'th')) {
      // Невозможно определить начальную точку ячейки
      return;
    }
    _startPoint.colPos = startPoint.cellIndex;
    if (!startPoint.parentElement || !startPoint.parentElement.tagName || startPoint.parentElement.tagName.toLowerCase() !== 'tr') {
      // Невозможно определить точку начала Ряда
      return;
    }
    _startPoint.rowPos = startPoint.parentElement.rowIndex;
  }

  /**
   * Определите информационный объект позиции виртуального стола.
   *
   * @param {int} rowIndex Положение индекса в строке виртуальной таблицы.
   * @param {int} cellIndex Позиция индекса в столбце виртуальной таблицы.
   * @param {object} baseRow Ряд, затронутый этой позицией.
   * @param {object} baseCell Клетка, на которую влияет эта позиция.
   * @param {bool} isSpan Сообщите, если это ячейка/строка span.
   */
  function setVirtualTablePosition(rowIndex, cellIndex, baseRow, baseCell, isRowSpan, isColSpan, isVirtualCell) {
    const objPosition = {
      'baseRow': baseRow,
      'baseCell': baseCell,
      'isRowSpan': isRowSpan,
      'isColSpan': isColSpan,
      'isVirtual': isVirtualCell,
    };
    if (!_virtualTable[rowIndex]) {
      _virtualTable[rowIndex] = [];
    }
    _virtualTable[rowIndex][cellIndex] = objPosition;
  }

  /**
   * Создайте объект ячейки действия.
   *
   * @param {object} virtualTableCellObj Объект определенного положения на виртуальном столе.
   * @param {enum} resultAction Действие, которое будет применено в этом пункте.
   */
  function getActionCell(virtualTableCellObj, resultAction, virtualRowPosition, virtualColPosition) {
    return {
      'baseCell': virtualTableCellObj.baseCell,
      'action': resultAction,
      'virtualTable': {
        'rowIndex': virtualRowPosition,
        'cellIndex': virtualColPosition,
      },
    };
  }

  /**
   * Восстановить свободный индекс строки для добавления Cell.
   *
   * @param {int} rowIndex Индекс строки для поиска свободного места.
   * @param {int} cellIndex Индекс ячейки для поиска свободного места в таблице.
   */
  function recoverCellIndex(rowIndex, cellIndex) {
    if (!_virtualTable[rowIndex]) {
      return cellIndex;
    }
    if (!_virtualTable[rowIndex][cellIndex]) {
      return cellIndex;
    }

    let newCellIndex = cellIndex;
    while (_virtualTable[rowIndex][newCellIndex]) {
      newCellIndex++;
      if (!_virtualTable[rowIndex][newCellIndex]) {
        return newCellIndex;
      }
    }
  }

  /**
   * Восстановление информации о строке и ячейке и добавление информации в виртуальную таблицу.
   *
   * @param {object} row Ряд для восстановления информации.
   * @param {object} cell Ячейка для восстановления информации.
   */
  function addCellInfoToVirtual(row, cell) {
    const cellIndex = recoverCellIndex(row.rowIndex, cell.cellIndex);
    const cellHasColspan = (cell.colSpan > 1);
    const cellHasRowspan = (cell.rowSpan > 1);
    const isThisSelectedCell = (row.rowIndex === _startPoint.rowPos && cell.cellIndex === _startPoint.colPos);
    setVirtualTablePosition(row.rowIndex, cellIndex, row, cell, cellHasRowspan, cellHasColspan, false);

    // Добавьте пролетные строки в виртуальную таблицу.
    const rowspanNumber = cell.attributes.rowSpan ? parseInt(cell.attributes.rowSpan.value, 10) : 0;
    if (rowspanNumber > 1) {
      for (let rp = 1; rp < rowspanNumber; rp++) {
        const rowspanIndex = row.rowIndex + rp;
        adjustStartPoint(rowspanIndex, cellIndex, cell, isThisSelectedCell);
        setVirtualTablePosition(rowspanIndex, cellIndex, row, cell, true, cellHasColspan, true);
      }
    }

    // Добавьте промежуточные столбцы в виртуальную таблицу.
    const colspanNumber = cell.attributes.colSpan ? parseInt(cell.attributes.colSpan.value, 10) : 0;
    if (colspanNumber > 1) {
      for (let cp = 1; cp < colspanNumber; cp++) {
        const cellspanIndex = recoverCellIndex(row.rowIndex, (cellIndex + cp));
        adjustStartPoint(row.rowIndex, cellspanIndex, cell, isThisSelectedCell);
        setVirtualTablePosition(row.rowIndex, cellspanIndex, row, cell, cellHasRowspan, true, true);
      }
    }
  }

  /**
   * Валидация процесса и корректировка начальной точки при необходимости
   *
   * @param {int} rowIndex
   * @param {int} cellIndex
   * @param {object} cell
   * @param {bool} isSelectedCell
   */
  function adjustStartPoint(rowIndex, cellIndex, cell, isSelectedCell) {
    if (rowIndex === _startPoint.rowPos && _startPoint.colPos >= cell.cellIndex && cell.cellIndex <= cellIndex && !isSelectedCell) {
      _startPoint.colPos++;
    }
  }

  /**
   * Создайте виртуальную таблицу ячеек со всеми ячейками, включая ячейки span.
   */
  function createVirtualTable() {
    const rows = domTable.rows;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].cells;
      for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
        addCellInfoToVirtual(rows[rowIndex], cells[cellIndex]);
      }
    }
  }

  /**
   * Получить действие, которое будет применено к ячейке.
   *
   * @param {object} cell виртуальная ячейка таблицы для применения действия
   */
  function getDeleteResultActionToCell(cell) {
    switch (where) {
      case TableResultAction.where.Column:
        if (cell.isColSpan) {
          return TableResultAction.resultAction.SubtractSpanCount;
        }
        break;
      case TableResultAction.where.Row:
        if (!cell.isVirtual && cell.isRowSpan) {
          return TableResultAction.resultAction.AddCell;
        } else if (cell.isRowSpan) {
          return TableResultAction.resultAction.SubtractSpanCount;
        }
        break;
    }
    return TableResultAction.resultAction.RemoveCell;
  }

  /**
   * Получить действие, которое будет применено к ячейке.
   *
   * @param {object} cell виртуальная ячейка таблицы для применения действия
   */
  function getAddResultActionToCell(cell) {
    switch (where) {
      case TableResultAction.where.Column:
        if (cell.isColSpan) {
          return TableResultAction.resultAction.SumSpanCount;
        } else if (cell.isRowSpan && cell.isVirtual) {
          return TableResultAction.resultAction.Ignore;
        }
        break;
      case TableResultAction.where.Row:
        if (cell.isRowSpan) {
          return TableResultAction.resultAction.SumSpanCount;
        } else if (cell.isColSpan && cell.isVirtual) {
          return TableResultAction.resultAction.Ignore;
        }
        break;
    }
    return TableResultAction.resultAction.AddCell;
  }

  function init() {
    setStartPoint();
    createVirtualTable();
  }

  /// ///////////////////////////////////////////
  // Общественные функции
  /// ///////////////////////////////////////////

  /**
   * Восстановление массива os что делать в таблице.
   */
  this.getActionList = function() {
    const fixedRow = (where === TableResultAction.where.Row) ? _startPoint.rowPos : -1;
    const fixedCol = (where === TableResultAction.where.Column) ? _startPoint.colPos : -1;

    let actualPosition = 0;
    let canContinue = true;
    while (canContinue) {
      const rowPosition = (fixedRow >= 0) ? fixedRow : actualPosition;
      const colPosition = (fixedCol >= 0) ? fixedCol : actualPosition;
      const row = _virtualTable[rowPosition];
      if (!row) {
        canContinue = false;
        return _actionCellList;
      }
      const cell = row[colPosition];
      if (!cell) {
        canContinue = false;
        return _actionCellList;
      }

      // Определите действие, которое будет применено в этой ячейке
      let resultAction = TableResultAction.resultAction.Ignore;
      switch (action) {
        case TableResultAction.requestAction.Add:
          resultAction = getAddResultActionToCell(cell);
          break;
        case TableResultAction.requestAction.Delete:
          resultAction = getDeleteResultActionToCell(cell);
          break;
      }
      _actionCellList.push(getActionCell(cell, resultAction, rowPosition, colPosition));
      actualPosition++;
    }

    return _actionCellList;
  };

  init();
};
/**
*
* Где происходит действие enum.
*/
TableResultAction.where = { 'Row': 0, 'Column': 1 };
/**
*
* Запрашиваемое действие для применения перечисления.
*/
TableResultAction.requestAction = { 'Add': 0, 'Delete': 1 };
/**
*
* Результат действия, которое должно быть выполнено enum.
*/
TableResultAction.resultAction = { 'Ignore': 0, 'SubtractSpanCount': 1, 'RemoveCell': 2, 'AddCell': 3, 'SumSpanCount': 4 };

/**
 *
 * @class editing.Table
 *
 * Table
 *
 */
export default class Table {
  /**
   * клавиша вкладки рукоятки
   *
   * @param {WrappedRange} rng
   * @param {Boolean} isShift
   */
  tab(rng, isShift) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const table = dom.ancestor(cell, dom.isTable);
    const cells = dom.listDescendant(table, dom.isCell);

    const nextCell = lists[isShift ? 'prev' : 'next'](cells, cell);
    if (nextCell) {
      range.create(nextCell, 0).select();
    }
  }

  /**
   * Добавить новый ряд
   *
   * @param {WrappedRange} rng
   * @param {String} position (top/bottom)
   * @return {Node}
   */
  addRow(rng, position) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);

    const currentTr = $(cell).closest('tr');
    const trAttributes = this.recoverAttributes(currentTr);
    const html = $('<tr' + trAttributes + '></tr>');

    const vTable = new TableResultAction(cell, TableResultAction.where.Row,
      TableResultAction.requestAction.Add, $(currentTr).closest('table')[0]);
    const actions = vTable.getActionList();

    for (let idCell = 0; idCell < actions.length; idCell++) {
      const currentCell = actions[idCell];
      const tdAttributes = this.recoverAttributes(currentCell.baseCell);
      switch (currentCell.action) {
        case TableResultAction.resultAction.AddCell:
          html.append('<td' + tdAttributes + '>' + dom.blank + '</td>');
          break;
        case TableResultAction.resultAction.SumSpanCount:
          {
            if (position === 'top') {
              const baseCellTr = currentCell.baseCell.parent;
              const isTopFromRowSpan = (!baseCellTr ? 0 : currentCell.baseCell.closest('tr').rowIndex) <= currentTr[0].rowIndex;
              if (isTopFromRowSpan) {
                const newTd = $('<div></div>').append($('<td' + tdAttributes + '>' + dom.blank + '</td>').removeAttr('rowspan')).html();
                html.append(newTd);
                break;
              }
            }
            let rowspanNumber = parseInt(currentCell.baseCell.rowSpan, 10);
            rowspanNumber++;
            currentCell.baseCell.setAttribute('rowSpan', rowspanNumber);
          }
          break;
      }
    }

    if (position === 'top') {
      currentTr.before(html);
    } else {
      const cellHasRowspan = (cell.rowSpan > 1);
      if (cellHasRowspan) {
        const lastTrIndex = currentTr[0].rowIndex + (cell.rowSpan - 2);
        $($(currentTr).parent().find('tr')[lastTrIndex]).after($(html));
        return;
      }
      currentTr.after(html);
    }
  }

  /**
   * Добавить новый столбец
   *
   * @param {WrappedRange} rng
   * @param {String} position (левый/правый)
   * @return {Node}
   */
  addCol(rng, position) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const row = $(cell).closest('tr');
    const rowsGroup = $(row).siblings();
    rowsGroup.push(row);

    const vTable = new TableResultAction(cell, TableResultAction.where.Column,
      TableResultAction.requestAction.Add, $(row).closest('table')[0]);
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      const currentCell = actions[actionIndex];
      const tdAttributes = this.recoverAttributes(currentCell.baseCell);
      switch (currentCell.action) {
        case TableResultAction.resultAction.AddCell:
          if (position === 'right') {
            $(currentCell.baseCell).after('<td' + tdAttributes + '>' + dom.blank + '</td>');
          } else {
            $(currentCell.baseCell).before('<td' + tdAttributes + '>' + dom.blank + '</td>');
          }
          break;
        case TableResultAction.resultAction.SumSpanCount:
          if (position === 'right') {
            let colspanNumber = parseInt(currentCell.baseCell.colSpan, 10);
            colspanNumber++;
            currentCell.baseCell.setAttribute('colSpan', colspanNumber);
          } else {
            $(currentCell.baseCell).before('<td' + tdAttributes + '>' + dom.blank + '</td>');
          }
          break;
      }
    }
  }

  /*
  * Копирование атрибутов из элемента.
  *
  * @param {object} Элемент для восстановления атрибутов.
  * @return {string} Копирование элементов строки.
  */
  recoverAttributes(el) {
    let resultStr = '';

    if (!el) {
      return resultStr;
    }

    const attrList = el.attributes || [];

    for (let i = 0; i < attrList.length; i++) {
      if (attrList[i].name.toLowerCase() === 'id') {
        continue;
      }

      if (attrList[i].specified) {
        resultStr += ' ' + attrList[i].name + '=\'' + attrList[i].value + '\'';
      }
    }

    return resultStr;
  }

  /**
   * Удалить текущую строку
   *
   * @param {WrappedRange} rng
   * @return {Node}
   */
  deleteRow(rng) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const row = $(cell).closest('tr');
    const cellPos = row.children('td, th').index($(cell));
    const rowPos = row[0].rowIndex;

    const vTable = new TableResultAction(cell, TableResultAction.where.Row,
      TableResultAction.requestAction.Delete, $(row).closest('table')[0]);
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      if (!actions[actionIndex]) {
        continue;
      }

      const baseCell = actions[actionIndex].baseCell;
      const virtualPosition = actions[actionIndex].virtualTable;
      const hasRowspan = (baseCell.rowSpan && baseCell.rowSpan > 1);
      let rowspanNumber = (hasRowspan) ? parseInt(baseCell.rowSpan, 10) : 0;
      switch (actions[actionIndex].action) {
        case TableResultAction.resultAction.Ignore:
          continue;
        case TableResultAction.resultAction.AddCell:
          {
            const nextRow = row.next('tr')[0];
            if (!nextRow) { continue; }
            const cloneRow = row[0].cells[cellPos];
            if (hasRowspan) {
              if (rowspanNumber > 2) {
                rowspanNumber--;
                nextRow.insertBefore(cloneRow, nextRow.cells[cellPos]);
                nextRow.cells[cellPos].setAttribute('rowSpan', rowspanNumber);
                nextRow.cells[cellPos].innerHTML = '';
              } else if (rowspanNumber === 2) {
                nextRow.insertBefore(cloneRow, nextRow.cells[cellPos]);
                nextRow.cells[cellPos].removeAttribute('rowSpan');
                nextRow.cells[cellPos].innerHTML = '';
              }
            }
          }
          continue;
        case TableResultAction.resultAction.SubtractSpanCount:
          if (hasRowspan) {
            if (rowspanNumber > 2) {
              rowspanNumber--;
              baseCell.setAttribute('rowSpan', rowspanNumber);
              if (virtualPosition.rowIndex !== rowPos && baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
            } else if (rowspanNumber === 2) {
              baseCell.removeAttribute('rowSpan');
              if (virtualPosition.rowIndex !== rowPos && baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
            }
          }
          continue;
        case TableResultAction.resultAction.RemoveCell:
          // Удалять ячейку не нужно, так как строка будет удалена.
          continue;
      }
    }
    row.remove();
  }

  /**
   * Удалить текущий столбец
   *
   * @param {WrappedRange} rng
   * @return {Node}
   */
  deleteCol(rng) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const row = $(cell).closest('tr');
    const cellPos = row.children('td, th').index($(cell));

    const vTable = new TableResultAction(cell, TableResultAction.where.Column,
      TableResultAction.requestAction.Delete, $(row).closest('table')[0]);
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      if (!actions[actionIndex]) {
        continue;
      }
      switch (actions[actionIndex].action) {
        case TableResultAction.resultAction.Ignore:
          continue;
        case TableResultAction.resultAction.SubtractSpanCount:
          {
            const baseCell = actions[actionIndex].baseCell;
            const hasColspan = (baseCell.colSpan && baseCell.colSpan > 1);
            if (hasColspan) {
              let colspanNumber = (baseCell.colSpan) ? parseInt(baseCell.colSpan, 10) : 0;
              if (colspanNumber > 2) {
                colspanNumber--;
                baseCell.setAttribute('colSpan', colspanNumber);
                if (baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
              } else if (colspanNumber === 2) {
                baseCell.removeAttribute('colSpan');
                if (baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
              }
            }
          }
          continue;
        case TableResultAction.resultAction.RemoveCell:
          dom.remove(actions[actionIndex].baseCell, true);
          continue;
      }
    }
  }

  /**
   * создать пустой элемент таблицы
   *
   * @param {Number} rowCount
   * @param {Number} colCount
   * @return {Node}
   */
  createTable(colCount, rowCount, options) {
    const tds = [];
    let tdHTML;
    for (let idxCol = 0; idxCol < colCount; idxCol++) {
      tds.push('<td>' + dom.blank + '</td>');
    }
    tdHTML = tds.join('');

    const trs = [];
    let trHTML;
    for (let idxRow = 0; idxRow < rowCount; idxRow++) {
      trs.push('<tr>' + tdHTML + '</tr>');
    }
    trHTML = trs.join('');
    const $table = $('<table>' + trHTML + '</table>');
    if (options && options.tableClassName) {
      $table.addClass(options.tableClassName);
    }

    return $table[0];
  }

  /**
   * Удалить текущую таблицу
   *
   * @param {WrappedRange} rng
   * @return {Node}
   */
  deleteTable(rng) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    $(cell).closest('table').remove();
  }
}
