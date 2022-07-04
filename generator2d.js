//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCharacterLengthMap = null
var gIntegerSet = new Set('-0123456789'.split(''))
var gLetteringMap = null
var gLetteringSet = null

function addPolygonsToGroup(polygons, registry, statement) {
	var exceptionSet = new Set(['checkIntersection', 'markerAbsolute', 'marker', 'outset'])
	var idStart = statement.attributeMap.get('id') + '_polygon_'
	var endStatement = statement.children.pop()
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var polygonStatement = getStatementByParentTag(new Map(), 0, statement, 'polygon')
		getUniqueID(idStart + polygonIndex.toString(), registry, statement)
		copyMissingKeysExcept(exceptionSet, statement.attributeMap, polygonStatement.attributeMap)
		statement.children.push(polygonStatement)
		setPointsHD(polygons[polygonIndex], polygonStatement)
		gPolygon.processStatement(registry, polygonStatement)
	}
	statement.children.push(endStatement)
}

function addPolylinesToGroup(polylines, registry, statement) {
	var idStart = statement.attributeMap.get('id') + '_polyline_'
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		var polylineStatement = getStatementByParentTag(new Map([['points', polylines[polylineIndex].join(' ')]]), 0, statement, 'polyline')
		getUniqueID(idStart + polylineIndex.toString(), registry, polylineStatement)
		statement.children.push(polylineStatement)
	}
}

function addTextStatement(fontSize, idStart, registry, statement, text, textAnchor, textStructure, writableWidth, x, y) {
	var textAttributeMap = new Map([['innerHTML', text], ['x', (x + textStructure.xOffset).toString()], ['y', y.toString()]])
	var localFontSize = textStructure.fontSize
	if (lineIsTooLong(writableWidth, localFontSize, text)) {
		localFontSize = writableWidth / getTextLength(text)
	}
	if (localFontSize != fontSize) {
		textAttributeMap.set('font-size', localFontSize.toString())
	}
	if (textAnchor != null) {
		textAttributeMap.set('text-anchor', textAnchor)
	}
	var textStatement = getStatementByParentTag(textAttributeMap, 0, statement, 'text')
	getUniqueID(idStart + textStructure.sequenceWord, registry, textStatement)
	statement.children.push(textStatement)
}

function cellX(registry, statement) {
	var gridAttributeMap = statement.parent.attributeMap
	var cellColumn = parseInt(gridAttributeMap.get('cellColumn'))
	if (cellColumn >= parseFloat(gridAttributeMap.get('columns'))) {
		cellColumn = 0
		gridAttributeMap.set('cellColumn', '0')
		gridAttributeMap.set('cellRow', (parseInt(gridAttributeMap.get('cellRow')) + 1).toString())
	}
	var x = cellColumn * parseFloat(gridAttributeMap.get('cellWidth'))
	gridAttributeMap.set('cellColumn', (parseInt(gridAttributeMap.get('cellColumn')) + 1).toString())
	return x
}

function cellY(registry, statement) {
	var gridAttributeMap = statement.parent.attributeMap
	return parseInt(gridAttributeMap.get('cellRow')) * parseFloat(gridAttributeMap.get('cellHeight'))
}

function createCharacterPolylineMap() {
	gLetteringSet = new Set(['B', 'K', 'R', 'X'])
	gLetteringMap = new Map()
	var bottomDiagonal = [[0, 1], [1, 0]]
	var bottomHorizontalSemicircle = arcFromToCenter(1, 0.5, 0, 0.5, 0.5)
	var bottomLeftArc = arcFromToCenter(1.0, 0.03, 0.5, 0, 0.8)
	var bottomLine = [[0, 0], [1, 0]]
	var bottomSemicircle = multiplyArraysByIndex(arcFromToCenter(0, 1, 0, 0, 0.5), 2.0, 0)
	var diagonalDown = [[0, 2], [1, 0]]
	var diagonalUp = [[0, 0], [1, 2]]
	var leftBisectedPolyline = [[0, 0], [0, 1], [0, 2]]
	var leftLine = [[0, 0], [0, 2]]
	var leftTallSemicircle = multiplyArraysByIndex(arcFromToCenter(1.0, 0, 1.0, 2, 1.0), 0.5, 0)
	var lowLeftLine = [[0, 0.5], [0, 2]]
	var lowRightLine = [[1, 0.5], [1, 2]]
	var middleLine = [[0, 1], [1, 1]]
	var middleVerticalLine = [[0.5, 0], [0.5, 2]]
	var rightBisectedPolyline = [[1, 0], [1, 1], [1, 2]]
	var rightLine = [[1, 0], [1, 2]]
	var rightTallSemicircle = multiplyArraysByIndex(arcFromToCenter(1.0, 2, 1.0, 0, 1.0), 0.5, 0)
	var topDiagonal = [[0, 1], [1, 2]]
	var topLine = [[0, 2], [1, 2]]
	var topRightArc = arcFromToCenter(0.5, 2, 1.0, 1.97, 0.8)
	var topSemicircle = multiplyArraysByIndex(arcFromToCenter(0, 2, 0, 1, 0.5), 2.0, 0)
	gLetteringMap.set('A', [[[0, 0], [0.2, 0.8], [0.5, 2], [0.8, 0.8], [1, 0]], [[0.2,0.8], [0.8,0.8]]])
	gLetteringMap.set('B', [bottomSemicircle, leftBisectedPolyline, topSemicircle])
	gLetteringMap.set('C', [bottomLeftArc, leftTallSemicircle, topRightArc])
	gLetteringMap.set('D', [arcFromToCenter(0, 2, 0, 0, 1), leftLine])
	gLetteringMap.set('E', [bottomLine, leftBisectedPolyline, middleLine, topLine])
	gLetteringMap.set('F', [leftBisectedPolyline, middleLine, topLine])
	gLetteringMap.set('G', [[[0.7, 0.9], [1.0, 0.9], [1.0, 0.03]], bottomLeftArc, leftTallSemicircle, topRightArc])
	gLetteringMap.set('H', [leftBisectedPolyline, middleLine, rightBisectedPolyline])
	gLetteringMap.set('I', [[[0.25, 0], [0.5, 0], [0.75, 0]], middleVerticalLine, [[0.25, 2], [0.5, 2], [0.75, 2]]])
	gLetteringMap.set('J', [[[0.5, 2], [1, 2]], lowRightLine, bottomHorizontalSemicircle])
	gLetteringMap.set('K', [leftBisectedPolyline, bottomDiagonal, topDiagonal])
	gLetteringMap.set('L', [bottomLine, leftLine])
	gLetteringMap.set('M', [leftLine, [[0, 2], [0.75, 0.2]], [[0.75, 0.2], [1.5, 2]], [[1.5, 2], [1.5, 0]]])
	gLetteringMap.set('N', [leftLine, diagonalDown, rightLine])
	gLetteringMap.set('O', [leftTallSemicircle, rightTallSemicircle])
	gLetteringMap.set('P', [leftBisectedPolyline, topSemicircle])
	gLetteringMap.set('Q', [leftTallSemicircle, rightTallSemicircle, [[0.5, 0], [0.9, -0.15]]])
	gLetteringMap.set('R', [leftBisectedPolyline, topSemicircle, bottomDiagonal])
	var s = [arcFromToCenter(0.5, 0, 0.1, 0.03, 0.8), arcFromToCenter(0.853, 0.853, 0.5, 0, 0.5)]
	pushArray(s, [[[0.853, 0.853], [0.147, 1.147]], arcFromToCenter(0.147, 1.147, 0.5, 2, 0.5), arcFromToCenter(0.5, 2, 0.9, 1.97, 0.8)])
	gLetteringMap.set('S', s)
	gLetteringMap.set('T', [middleVerticalLine, [[0, 2], [0.5, 2], [1, 2]]])
	gLetteringMap.set('U', [lowRightLine, bottomHorizontalSemicircle, lowLeftLine])
	gLetteringMap.set('V', [[[0, 2], [0.5, 0], [1, 2]]])
	gLetteringMap.set('W', [[[0, 2], [0.375, 0], [0.75, 1.8], [1.125, 0], [1.5, 2]]])
	gLetteringMap.set('X', [diagonalDown, diagonalUp])
	gLetteringMap.set('Y', [[[0.5, 0], [0.5, 1]], [[0, 2], [0.5, 1], [1, 2]]])
	gLetteringMap.set('Z', [bottomLine, diagonalUp, topLine])
}

function getYAddSequenceWord(attributeMap, fontSize, idStart, registry, lineHeight, statement, textStructure, writableWidth, x, xStart, y) {
	sequenceWord = textStructure.sequenceWord
	if (!attributeMap.has(sequenceWord)) {
		return y
	}
	var localLineHeight = lineHeight
	if (textStructure.fontSize != fontSize) {
		localLineHeight += textStructure.fontSize - fontSize
	}
	var value = attributeMap.get(sequenceWord)
	var variableValue = getVariableValue(value, statement)
	if (variableValue != undefined) {
		value = variableValue
	}
	var textAnchor = 'start'
	if (textStructure.textAnchor != null) {
		textAnchor = textStructure.textAnchor
	}
	if (value[0] == '#') {
		var line = ''
		var lines = []
		var valueWords = value.slice(1).split(' ').filter(lengthCheck)
		for (var valueWord of valueWords) {
			if (valueWord[0] == '#') {
				lines.push(line)
				line = ''
				for (var charactersRemoved = 0; charactersRemoved < 987; charactersRemoved++) {
					valueWord = valueWord.slice(1).trim()
					if (valueWord.length == 0) {
						break
					}
					if (valueWord[0] == '#') {
						lines.push('')
					}
					else {
						if (lineIsTooLong(writableWidth, textStructure.fontSize, valueWord)) {
							lines.push(valueWord)
						}
						else {
							line = valueWord
						}
						break
					}
				}
			}
			else {
				if (line.length > 0) {
					var checkLine = line + ' ' + valueWord
					if (lineIsTooLong(writableWidth, textStructure.fontSize, checkLine)) {
						lines.push(line)
						if (lineIsTooLong(writableWidth, textStructure.fontSize, valueWord)) {
							lines.push(valueWord)
						}
						else {
							line = valueWord
						}
					}
					else {
						line = checkLine
					}
				}
				else {
					if (lineIsTooLong(writableWidth, textStructure.fontSize, valueWord)) {
						lines.push(valueWord)
					}
					else {
						line = valueWord
					}
				}
			}
		}
		if (line.length > 0) {
			lines.push(line)
		}
		for (var line of lines) {
			addTextStatement(fontSize, idStart, registry, statement, line, textAnchor, textStructure, writableWidth, xStart, y)
			y += localLineHeight
		}
		return y
	}
	if (value[0] == '^') {
		var columnWords = value.slice(1).split('^').filter(lengthCheck)
		var rowEndRoundedUp = Math.ceil(columnWords.length / columns)
		var originalY = y
		var totalRowIndex = 0
		var columnOffset = writableWidth / columns
		var columnX = xStart
		for (var columnIndex = 0; columnIndex < columns; columnIndex++) {
			y = originalY
			for (var rowIndex = 0; rowIndex < rowEndRoundedUp; rowIndex++) {
				if (totalRowIndex < columnWords.length) {
					var word = columnWords[totalRowIndex]
					addTextStatement(fontSize, idStart, registry, statement, word, textAnchor, textStructure, writableWidth, columnX, y)
					y += localLineHeight
					totalRowIndex += 1
				}
			}
			columnX += columnOffset
		}
		return y
	}
	addTextStatement(fontSize, idStart, registry, statement, value, textStructure.textAnchor, textStructure, writableWidth, x, y)
	return y + localLineHeight
}

function getBox(registry, statement) {
	var points = getPointsHD(registry, statement)
	if (getIsEmpty(points)) {
		return null
	}
	var pointZero = points[0]
	if (points.length == 1) {
		if (pointZero[1] == 0.0) {
			pointZero[1] = pointZero[0]
		}
		points.push([0.0, 0.0])
	}
	if (points.length == 2) {
		var minimumX = Math.min(points[0][0], points[1][0])
		var minimumY = Math.min(points[0][1], points[1][1])
		var maximumX = Math.max(points[0][0], points[1][0])
		var maximumY = Math.max(points[0][1], points[1][1])
		points = [[minimumX, minimumY], [minimumX, maximumY], [maximumX, maximumY], [maximumX, minimumY]]
	}
	if (pointZero.length > 2) {
		var z = pointZero[2]
		for (var point of points) {
			point.push(z)
		}
	}
	return points
}

function getLetteringOutlines(fontHeight, strokeWidth, text, textAlign) {
	var betweenCharacter = 0.1 * fontHeight + strokeWidth
	var halfHeight = fontHeight * 0.5
	var fontMultiplier = [halfHeight, halfHeight]
	var averageAdvance = halfHeight + betweenCharacter
	var radius = strokeWidth / fontHeight
	var radiusPoint = [radius, radius]
	var letteringOutlines = []
	var maximumX = 0
	var minimumX = null
	var x = 0
	if (gLetteringMap == null) {
		createCharacterPolylineMap()
	}
	for (var character of text) {
		var polylines = gLetteringMap.get(character)
		if (polylines != null) {
			var outlines = getOutlines(gLetteringSet.has(character), null, false, radiusPoint, polylines)
			multiplyXYArrays(outlines, fontMultiplier)
			var boundingX = getBoundingXByPolygons(outlines)
			x -= boundingX[0]
			if (minimumX == null) {
				minimumX = x
			}
			addArrayArraysByIndex(outlines, x, 0)
			pushArray(letteringOutlines, outlines)
			x += boundingX[1]
			maximumX = x
			x += betweenCharacter
		}
		else {
			x += averageAdvance
		}
	}
	if (minimumX == null) {
		return letteringOutlines
	}
	addArrayArraysByIndex(letteringOutlines, textAlign * (minimumX - maximumX) - minimumX, 0)
	return letteringOutlines
}

function getTextLength(text) {
	if (gCharacterLengthMap == null) {
		gCharacterLengthMap = new Map()
		var characterLengths = 'a 5.962 b 6.402 c 5.601 d 6.402 e 5.918 f 3.701 g 6.402 h 6.441 i 3.198'.split(' ')
		pushArray(characterLengths, 'j 3.101 k 6.059 l 3.198 m 9.483 n 6.441 o 6.021 p 6.402 q 6.402 r 4.780'.split(' '))
		pushArray(characterLengths, 's 5.132 t 4.018 u 6.441 v 5.649 w 8.559 x 5.640 y 5.649 z 5.268'.split(' '))
		pushArray(characterLengths, 'A 7.222 B 7.348 C 7.652 D 8.017 E 7.300 F 6.938 G 7.988 H 8.721 I 3.950'.split(' '))
		pushArray(characterLengths, 'J 4.009 K 7.471 L 6.641 M 10.239 N 8.750 O 8.198 P 6.728 Q 8.198 R 7.529'.split(' '))
		pushArray(characterLengths, 'S 6.851 T 6.670 U 8.427 V 7.222 W 10.278 X 7.119 Y 6.602 Z 6.948'.split(' '))
		pushArray(characterLengths, '0 6.363 1 6.363 2 6.363 3 6.363 4 6.363 5 6.363 6 6.363 7 6.363 8 6.363 9 6.363'.split(' '))
		pushArray(characterLengths, ') 3.902 ! 4.018 @ 10.000 # 8.379 $ 6.363 % 9.502 ^ 8.379 & 8.902 * 5.000 ( 3.902'.split(' '))
		pushArray(characterLengths, ', 3.178 < 8.379 . 3.178 > 8.379 / 3.369 ? 5.362 ; 3.369 : 3.369 [ 3.902'.split(' '))
		pushArray(characterLengths, '{ 6.363 ] 3.902 } 6.363 | 3.369 - 3.379 _ 5.000 = 8.379 + 8.379 ` 5.000 ~ 8.379'.split(' '))
		for (var characterIndex = 0; characterIndex < characterLengths.length; characterIndex += 2) {
			gCharacterLengthMap.set(characterLengths[characterIndex], 0.1 * parseFloat(characterLengths[characterIndex + 1]))
		}
	}
	gCharacterLengthMap.set(' ', 0.3)
	gCharacterLengthMap.set("'", 0.32)
	gCharacterLengthMap.set('"', 0.4)
	var textLength = 0.0
	for (var character of text) {
		if (gCharacterLengthMap.has(character)) {
			textLength += gCharacterLengthMap.get(character)
		}
		else {
			textLength += 0.62
		}
	}
//	return textLength
//	increased because of overlap in list description
	return 1.1 * textLength
}

function lineIsTooLong(cellWidth, fontSize, line) {
	return getTextLength(line) * fontSize > cellWidth
}

var gGrid = {
	initialize: function() {
		gTagBeginMap.set(this.name, this)
		addFunctionToVariableEntries(cellX, gSetR)
		addFunctionToVariableEntries(cellY, gSetR)
	},
	name: 'grid',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var columns = getIntByDefault(1, 'columns', registry, statement, this.name)
		var corner = getBooleanByDefault(true, 'corner', registry, statement, this.name)
		var rows = getIntByDefault(1, 'rows', registry, statement, this.name)
		var gridHeight = getFloatByDefault(100.0, 'gridHeight', registry, statement, this.name)
		var gridWidth = getFloatByDefault(100.0, 'gridWidth', registry, statement, this.name)
		var inside = getBooleanByDefault(true, 'inside', registry, statement, this.name)
		var lineLength = getFloatByDefault(2.0, 'lineLength', registry, statement, this.name)
		var outside = getBooleanByDefault(true, 'outside', registry, statement, this.name)
		var cellHeight = gridHeight / rows
		var cellWidth = gridWidth / columns
		attributeMap.set('cellColumn', '0')
		attributeMap.set('cellHeight', cellHeight.toString())
		attributeMap.set('cellRow', '0')
		attributeMap.set('cellWidth', cellWidth.toString())
		attributeMap.set('columns', columns.toString())
		attributeMap.set('gridHeight', gridHeight.toString())
		attributeMap.set('gridWidth', gridWidth.toString())
		attributeMap.set('rows', rows.toString())
		var groupMap = new Map(attributeMap)
		attributeMap.delete('style')
		if (!corner && !inside && !outside) {
			return
		}
		var groupStatement = getStatementByParentTag(groupMap, 1, statement, 'group')
		getUniqueID('gridGroup', registry, groupStatement)
		statement.parent.children.splice(-1, 0, groupStatement)
		var polylines = []
		var x = 0.0
		var y = 0.0
		if (corner) {
			polylines.push([[0, 0], [lineLength, 0]])
			polylines.push([[gridWidth - lineLength, 0], [gridWidth, 0]])
			polylines.push([[0, gridHeight], [lineLength, gridHeight]])
			polylines.push([[gridWidth - lineLength, gridHeight], [gridWidth, gridHeight]])
			polylines.push([[0, 0], [0, lineLength]])
			polylines.push([[gridWidth, 0], [gridWidth, lineLength]])
			polylines.push([[0, gridHeight - lineLength], [0, gridHeight]])
			polylines.push([[gridWidth, gridHeight - lineLength], [gridWidth, gridHeight]])
		}
		if (inside) {
			var halfLineLength = 0.5 * lineLength
			y = 0.0
			for (var yIndex = 1; yIndex < rows; yIndex++) {
				y += cellHeight
				x = 0.0
				for (var xIndex = 1; xIndex < columns; xIndex++) {
					x += cellWidth
					polylines.push([[x - halfLineLength, y], [x + halfLineLength, y]])
					polylines.push([[x, y - halfLineLength], [x, y + halfLineLength]])
				}
			}
		}
		if (outside) {
			x = 0.0
			for (var xIndex = 1; xIndex < columns; xIndex++) {
				x += cellWidth
				polylines.push([[x, 0], [x, lineLength]])
				polylines.push([[x, gridHeight - lineLength], [x, gridHeight]])
			}
			y = 0.0
			for (var yIndex = 1; yIndex < rows; yIndex++) {
				y += cellHeight
				polylines.push([[0, y], [lineLength, y]])
				polylines.push([[gridWidth - lineLength, y], [gridWidth, y]])
			}
		}
		addPolylinesToGroup(polylines, registry, groupStatement)
		addClosingStatement(groupStatement)
	}
}

var gLettering = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'lettering',
	processStatement:function(registry, statement) {
		var fontHeight = getFloatByDefault(12.0, 'fontHeight', registry, statement, this.name)
		var strokeWidth = getFloatByDefault(2.0, 'strokeWidth', registry, statement, this.name)
		var text = getValueByKeyDefault('TEXT', 'text', registry, statement, this.name)
		var textAlign = getFloatByDefault(0.0, 'textAlign', registry, statement, this.name)
		var outlines = getLetteringOutlines(fontHeight, strokeWidth, text, textAlign)
		if (outlines.length == 0) {
			return
		}
		addClosingStatementConvertToGroup(statement)
		addPolygonsToGroup(outlines, registry, statement)
	}
}

var gList = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'list',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByStatement(statement.parent)
		var columns = 2
		if (variableMap.has('_listColumns')) {
			columns = parseInt(variableMap.get('_listColumns'))
		}
		var lineHeight = 5.0
		if (variableMap.has('_listLineHeight')) {
			lineHeight = parseFloat(variableMap.get('_listLineHeight'))
		}
		var margin = 2.0
		if (variableMap.has('_listMargin')) {
			margin = parseFloat(variableMap.get('_listMargin'))
		}
		var cellWidth = parseFloat(getValueByDefault('100.0', getAttributeValue('cellWidth', statement)))
		var x = undefined
		if (variableMap.has('_listX')) {
			x = parseFloat(variableMap.get('_listX'))
		}
		var fontSize = parseFloat(getValueByDefault('3.5', getAttributeValue('font-size', statement)))
		columns = getIntByDefault(columns, 'columns', registry, statement, this.name)
		lineHeight = getFloatByDefault(lineHeight, 'lineHeight', registry, statement, this.name)
		margin = getFloatByDefault(margin, 'margin', registry, statement, this.name)
		x = getFloatByDefault(getValueByDefault(0.5 * cellWidth, x), 'x', registry, statement, this.name)
		variableMap.set('_listColumns', columns.toString())
		variableMap.set('_listLineHeight', lineHeight.toString())
		variableMap.set('_listMargin', margin.toString())
		variableMap.set('_listX', x.toString())
		var yStart = getFloatByDefault(5.0, 'y', registry, statement, this.name)
		var sequenceYs = null
		if (variableMap.has('_listSequenceYs')) {
			sequenceYs = variableMap.get('_listSequenceYs')
		}	
		if (attributeMap.has('sequence')) {
			sequenceYs = []
			var sequenceWords = attributeMap.get('sequence').split(' ').filter(lengthCheck)
			var sequence = null
			for (var sequenceWord of sequenceWords) {
				if (sequenceWord.length > 0) {
					if (gIntegerSet.has(sequenceWord[0])) {
						sequence = []
						sequenceYs.push({sequence:sequence, yStart:parseFloat(sequenceWord)})
					}
					else {
						var sequenceAttributes = sequenceWord.split(',')
						var textStructure = {fontSize:fontSize, sequenceWord:sequenceAttributes[0], textAnchor:null, xOffset:0.0}
						if (sequenceAttributes.length > 1) {
							if (sequenceAttributes[1].length > 0) {
								textStructure.fontSize = parseFloat(sequenceAttributes[1])
							}
						}
						if (sequenceAttributes.length > 2) {
							if (sequenceAttributes[2].length > 0) {
								textStructure.textAnchor = sequenceAttributes[2]
							}
						}
						if (sequenceAttributes.length > 3) {
							if (sequenceAttributes[3].length > 0) {
								textStructure.xOffset = parseFloat(sequenceAttributes[3])
							}
						}
						if (sequence == null) {
							sequence = [textStructure]
							sequenceYs.push({sequence:sequence, yStart:yStart})
						}
						else {
							sequence.push(textStructure)
						}
					}
				}
			}
		}
		if (sequenceYs == null) {
			return
		}
		variableMap.set('_listSequenceYs', sequenceYs)
		var writableWidth = cellWidth - margin - margin
		var xStart = x - 0.5 * writableWidth
		if (statement.children.length > 0) {
			if (statement.children[statement.children.length - 1].nestingIncrement == -1) {
				statement.children.pop()
			}
		}
		var idStart = statement.attributeMap.get('id') + '_'
		for (var sequenceY of sequenceYs) {
			var y = sequenceY.yStart
			for (var textStructure of sequenceY.sequence) {
				y = getYAddSequenceWord(
				attributeMap, fontSize, idStart, registry, lineHeight, statement, textStructure, writableWidth, x, xStart, y)
			}
		}
		addClosingStatementConvertToGroup(statement)
	}
}

var gOutline = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'outline',
	processStatement: function(registry, statement) {
		var polylines = getChainPointListsHDRecursivelyDelete(registry, statement, 'polyline')
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		for (var polygon of polygons) {
			if (polygon.length > 0) {
				polygon.push(polygon[0])
				polylines.push(polygon)
			}
		}
		var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, this.name)
		var markerAbsolute = getBooleanByDefault(true, 'markerAbsolute', registry, statement, this.name)
		var marker = getPointsByKey('marker', registry, statement)
		var radius = getPointByDefault([1.0, 1.0], 'radius', registry, statement, this.name)
		var outlines = getOutlines(checkIntersection, marker, markerAbsolute, radius, polylines)
		statement.tag = 'g'
		if (!getIsEmpty(outlines)) {
			addPolygonsToGroup(outlines, registry, statement)
		}
	}
}

var gPolygon = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygon',
	processStatement: function(registry, statement) {
		var points = getPointsHD(registry, statement)
		if (points == null) {
			return
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gPolyline = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'polyline',
	processStatement: function(registry, statement) {
		var points = getPointsHD(registry, statement)
		if (points == null) {
			return
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gRectangle = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'rectangle',
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var points = getBox(registry, statement)
		if (getIsEmpty(points)) {
			return
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gScreen = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'screen',
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var box = getBox(registry, statement)
		if (getIsEmpty(box)) {
			return
		}
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name) * gRadiansPerDegree
		var thickness = getFloatByDefault(2.0, 'thickness', registry, statement, this.name)
		var width = getFloatByDefault(10.0, 'width', registry, statement, this.name)
		var bottomLeft = box[0]
		var topRight = box[2]
		var innerLeft = bottomLeft[0] + thickness
		var holePolygons = getHolePolygons(innerLeft, topRight[0] - thickness, bottomLeft[1], topRight, overhangAngle, thickness, width)
		var polygon = getConnectedPolygon([box.reverse()].concat(holePolygons)).reverse()
		statement.tag = 'polygon'
		setPointsExcept(polygon, registry, statement, this.name)
	}
}

var gText = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'text',
	processStatement: function(registry, statement) {
		var x = getFloatByDefault(0.0, 'x', registry, statement, this.name)
		var y = getFloatByDefault(0.0, 'y', registry, statement, this.name)
		statement.attributeMap.set('x', x.toString())
		statement.attributeMap.set('y', y.toString())
	}
}

var gVerticalHole = {
	initialize: function() {
		addToCapitalizationMap('sagAngle')
		gTagCenterMap.set(this.name, this)
	},
	name: 'verticalHole',
	processStatement: function(registry, statement) {
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name) * gRadiansPerDegree
		var cx = getFloatByDefault(0.0, 'cx', registry, statement, this.name)
		var cy = getFloatByDefault(0.0, 'cy', registry, statement, this.name)
		var radius = getFloatByDefault(1.0, 'r', registry, statement, this.name)
		var sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name) * gRadiansPerDegree
		var sides = getFloatByDefault(24.0, 'sides', registry, statement, this.name)
		points = []
		beginAngle = Math.PI / 2.0 - overhangAngle
		endAngle = 1.5 * Math.PI + overhangAngle
		maximumIncrement = 2.0 * Math.PI / sides
		deltaAngle = endAngle - beginAngle
		arcSides = Math.ceil(deltaAngle / maximumIncrement - 0.001 * overhangAngle)
		angleIncrement = deltaAngle / arcSides
		halfAngleIncrement = 0.5 * angleIncrement
		beginAngle -= halfAngleIncrement
		endAngle += halfAngleIncrement + 0.001 * overhangAngle
		outerRadius = radius / Math.cos(0.5 * angleIncrement)
		for (pointAngle = beginAngle; pointAngle < endAngle; pointAngle += angleIncrement) {
			x = cx + Math.sin(pointAngle) * outerRadius
			y = cy + Math.cos(pointAngle) * outerRadius
			points.push([x, y])
		}
		topY = cy + radius
		deltaBegin = getXYSubtraction(points[0], points[1])
		sagRunOverRise = Math.cos(sagAngle) / Math.sin(sagAngle)
		segmentRunOverRise = deltaBegin[0] / deltaBegin[1]
		approachRunOverRise = sagRunOverRise - segmentRunOverRise
		topMinusSegment = topY - points[0][1]
		topX = topMinusSegment * segmentRunOverRise + points[0][0]
		aboveMinusTopY = (topX - cx) / approachRunOverRise
		sagDeltaX = aboveMinusTopY * sagRunOverRise
		aboveY = topY + aboveMinusTopY
		points[0] = [cx + sagDeltaX, aboveY]
		points[points.length - 1] = [cx - sagDeltaX, aboveY]
		for (pointIndex = 0; pointIndex < points.length; pointIndex++) {
			point = points[pointIndex]
			points[pointIndex] = [point[0].toFixed(3), point[1].toFixed(3)]
		}
		statement.tag = 'polygon'
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gGenerator2DProcessors = [gGrid, gLettering, gList, gOutline, gPolygon, gPolyline, gRectangle, gScreen, gText, gVerticalHole]
