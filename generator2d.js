//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCharacterLengthMap = null
var gIntegerSet = new Set('-0123456789'.split(''))
var gLetteringMap = null
var gLetteringSet = null

function addPolygonsToGroup(polygons, registry, statement) {
	var exceptionSet = new Set(['checkIntersection', 'markerAbsolute', 'marker', 'outset'])
	var idStart = statement.attributeMap.get('id') + '_polygon_'
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var polygonStatement = getStatementByParentTag(new Map(), 0, statement, 'polygon')
		getUniqueID(idStart + polygonIndex.toString(), registry, polygonStatement)
		copyMissingKeysExcept(exceptionSet, statement.attributeMap, polygonStatement.attributeMap)
		setPointsHD(polygons[polygonIndex], polygonStatement)
		gPolygon.processStatement(registry, polygonStatement)
	}
}

function addPolylinesToGroup(polylines, registry, statement) {
	var idStart = statement.attributeMap.get('id') + '_polyline_'
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		var polylineStatement = getStatementByParentTag(new Map([['points', polylines[polylineIndex].join(' ')]]), 0, statement, 'polyline')
		getUniqueID(idStart + polylineIndex.toString(), registry, polylineStatement)
	}
}

function addTextStatement(anchor, fontSize, format, idStart, registry, statement, text, writableWidth, x, y) {
	var textAttributeMap = new Map([['innerHTML', text], ['x', (x + format.xOffset).toString()], ['y', y.toString()]])
	var localFontSize = format.fontSize
	if (lineIsTooLong(writableWidth, localFontSize, text)) {
		localFontSize = writableWidth / getTextLength(text)
	}
	if (localFontSize != fontSize) {
		textAttributeMap.set('font-size', localFontSize.toString())
	}
	if (anchor != null) {
		textAttributeMap.set('text-anchor', anchor)
	}
	var textStatement = getStatementByParentTag(textAttributeMap, 0, statement, 'text')
	getUniqueID(idStart + format.name, registry, textStatement)
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

function getYAddFormatWord(attributeMap, fontSize, format, idStart, registry, lineHeight, statement, writableWidth, x, xStart, y) {
	var name = format.name
	if (!attributeMap.has(name)) {
		return y
	}
	var localLineHeight = lineHeight
	if (format.fontSize != fontSize) {
		localLineHeight += format.fontSize - fontSize
	}
	var value = attributeMap.get(name)
	value = getValueByDefault(value, getVariableValue(value, statement))
	var anchor = 'start'
	if (format.anchor != null) {
		anchor = format.anchor
	}
	if (value[0] == '#') {
		var line = ''
		var lines = []
		var valueWords = value.slice(1).split(' ').filter(lengthCheck)
		writableWidth += format.margin - format.rightMargin
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
						if (lineIsTooLong(writableWidth, format.fontSize, valueWord)) {
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
					if (lineIsTooLong(writableWidth, format.fontSize, checkLine)) {
						lines.push(line)
						if (lineIsTooLong(writableWidth, format.fontSize, valueWord)) {
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
					if (lineIsTooLong(writableWidth, format.fontSize, valueWord)) {
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
			addTextStatement(anchor, fontSize, format, idStart, registry, statement, line, writableWidth, xStart, y)
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
					addTextStatement(anchor, fontSize, format, idStart, registry, statement, word, writableWidth, columnX, y)
					y += localLineHeight
					totalRowIndex += 1
				}
			}
			columnX += columnOffset
		}
		return y
	}
	addTextStatement(format.anchor, fontSize, format, idStart, registry, statement, value, writableWidth, x, y)
	return y + localLineHeight
}

function getBox(registry, statement) {
	var points = getPointsHD(registry, statement)
	if (getIsEmpty(points)) {
		return null
	}
	for (var point of points) {
		if (point.length == 1) {
			point.push(0.0)
		}
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
	var averageAdvance = halfHeight + betweenCharacter
	var fontMultiplier = [halfHeight, halfHeight]
	var letteringOutlines = []
	var maximumX = 0
	var minimumX = null
	var radius = strokeWidth / fontHeight
	var outsets = [[radius, radius]]
	var x = 0
	if (gLetteringMap == null) {
		createCharacterPolylineMap()
	}
	for (var character of text) {
		var polylines = gLetteringMap.get(character)
		if (polylines != null) {
			var outlines = getOutlines(null, null, gLetteringSet.has(character), true, outsets, polylines, null)
			multiply2DArrays(outlines, fontMultiplier)
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
//	checkFlaw
//	return textLength
//	increased because of overlap in list description
	return 1.1 * textLength
}

function lineIsTooLong(cellWidth, fontSize, line) {
	return getTextLength(line) * fontSize > cellWidth
}

var gCircle = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'circle',
	processStatement: function(registry, statement) {
		var cx = getFloatByDefault(0.0, 'cx', registry, statement, this.name)
		var cy = getFloatByDefault(0.0, 'cy', registry, statement, this.name)
		var r = getFloatByDefault(1.0, 'r', registry, statement, this.name)
	}
}

var gGrid = {
	initialize: function() {
		gTagBeginMap.set(this.name, this)
		addFunctionToVariableEntries(cellX, gSetR)
		addFunctionToVariableEntries(cellY, gSetR)
	},
	name: 'grid',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var attributeMap = statement.attributeMap
		var columns = getIntByDefault(1, 'columns', registry, statement, this.name)
		var cornerMultiplier = getFloatByDefault(1.0, 'corner', registry, statement, this.name)
		var rows = getIntByDefault(1, 'rows', registry, statement, this.name)
		var gridHeight = getFloatByDefault(100.0, 'gridHeight', registry, statement, this.name)
		var gridWidth = getFloatByDefault(100.0, 'gridWidth', registry, statement, this.name)
		var insideMultiplier = getFloatByDefault(1.0, 'inside', registry, statement, this.name)
		var lineLength = getFloatByDefault(2.0, 'lineLength', registry, statement, this.name)
		var outsideMultiplier = getFloatByDefault(1.0, 'outside', registry, statement, this.name)
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
		if (cornerMultiplier * insideMultiplier * outsideMultiplier == 0.0) {
			return
		}
		var groupStatement = getStatementByParentTag(groupMap, 1, statement, 'group')
		getUniqueID('gridGroup', registry, groupStatement)
		var polylines = []
		var x = 0.0
		var y = 0.0
		if (cornerMultiplier != 0.0) {
			var cornerLength = lineLength * cornerMultiplier
			polylines.push([[0, 0], [cornerMultiplier, 0]])
			polylines.push([[gridWidth - cornerMultiplier, 0], [gridWidth, 0]])
			polylines.push([[0, gridHeight], [cornerMultiplier, gridHeight]])
			polylines.push([[gridWidth - cornerMultiplier, gridHeight], [gridWidth, gridHeight]])
			polylines.push([[0, 0], [0, cornerMultiplier]])
			polylines.push([[gridWidth, 0], [gridWidth, cornerMultiplier]])
			polylines.push([[0, gridHeight - cornerMultiplier], [0, gridHeight]])
			polylines.push([[gridWidth, gridHeight - cornerMultiplier], [gridWidth, gridHeight]])
		}
		if (insideMultiplier != 0.0) {
			var insideLength = lineLength * insideMultiplier
			y = 0.0
			for (var yIndex = 1; yIndex < rows; yIndex++) {
				y += cellHeight
				x = 0.0
				for (var xIndex = 1; xIndex < columns; xIndex++) {
					x += cellWidth
					polylines.push([[x - insideLength, y], [x + insideLength, y]])
					polylines.push([[x, y - insideLength], [x, y + insideLength]])
				}
			}
		}
		if (outsideMultiplier != 0.0) {
			var outsideLength = lineLength * insideMultiplier
			var x = 0.0
			for (var xIndex = 1; xIndex < columns; xIndex++) {
				x += cellWidth
				polylines.push([[x, 0], [x, outsideLength]])
				polylines.push([[x, gridHeight - outsideLength], [x, gridHeight]])
				polylines.push([[x - outsideLength, 0], [x + outsideLength, 0]])
				polylines.push([[x - outsideLength, gridHeight], [x + outsideLength, gridHeight]])
			}
			y = 0.0
			for (var yIndex = 1; yIndex < rows; yIndex++) {
				y += cellHeight
				polylines.push([[0, y], [outsideLength, y]])
				polylines.push([[gridWidth - outsideLength, y], [gridWidth, y]])
				polylines.push([[0, y - outsideLength], [0, y + outsideLength]])
				polylines.push([[gridWidth, y - outsideLength], [gridWidth, y + outsideLength]])
			}
		}
		addPolylinesToGroup(polylines, registry, groupStatement)
	}
}

var gImage = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'image',
	processStatement: function(registry, statement) {
		getPointsExcept(null, registry, statement, this.name)
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
			noticeByList(['No outlines could be generated for lettering in generator2d.', statement])
			return
		}
		convertToGroup(statement)
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
		var formatFunctionMap = new Map([['fontSize', parseFloat], ['xOffset', parseFloat], ['y', parseFloat]])
		var formats = null
		if (variableMap.has('_listFormats')) {
			formats = variableMap.get('_listFormats')
		}	
		if (attributeMap.has('formats')) {
			formats = []
			var formatWords = attributeMap.get('formats').split(' ').filter(lengthCheck)
			for (var formatWord of formatWords) {
				if (formatWord.length > 0) {
					var formatAttributes = formatWord.split(';')
					var format = {anchor:null, fontSize:fontSize, margin:margin, rightMargin:margin, xOffset:0.0}
					formats.push(format)
					for (var formatAttribute of formatAttributes) {
						var formatEntry = formatAttribute.split(':')
						if (formatEntry[1].length > 0) {
							setObjectAttribute(formatEntry[0], formatFunctionMap, format, formatEntry[1])
						}
					}
				}
			}
		}
		if (formats == null) {
			noticeByList(['No formats could be found for list in generator2d.', statement])
			return
		}
		variableMap.set('_listFormats', formats)
		var writableWidth = cellWidth - margin - margin
		var xStart = x - 0.5 * writableWidth
		var idStart = statement.attributeMap.get('id') + '_'
		var y = yStart
		for (var format of formats) {
			if (format.y != undefined) {
				y = format.y
			}
			y = getYAddFormatWord(attributeMap, fontSize, format, idStart, registry, lineHeight, statement, writableWidth, x, xStart, y)
		}
		convertToGroup(statement)
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
		var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
		var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, this.name)
		var markerAbsolute = getBooleanByDefault(true, 'markerAbsolute', registry, statement, this.name)
		var marker = getPointsByKey('marker', registry, statement)
		var baseMarker = getPointsByKey('baseMarker', registry, statement)
		var tipMarker = getPointsByKey('tipMarker', registry, statement)
		if (getIsEmpty(baseMarker)) {
			baseMarker = marker
		}
		if (getIsEmpty(tipMarker)) {
			tipMarker = marker
		}
		var outsets = getOutsets(registry, statement)
		var outlines = getOutlines(baseLocation, baseMarker, checkIntersection, markerAbsolute, outsets, polylines, tipMarker)
		if (getIsEmpty(outlines)) {
			noticeByList(['No outlines could be found for outline in generator2d.', statement])
		}
		else{
			convertToGroup(statement)
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
			noticeByList(['No points could be found for polygon in generator2d.', statement])
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
			noticeByList(['No points could be found for polyline in generator2d.', statement])
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
			noticeByList(['No points could be found for rectangle in generator2d.', statement])
			return
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gRegularPolygon = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'regularPolygon',
	processStatement: function(registry, statement) {
		var cx = getFloatByDefault(0.0, 'cx', registry, statement, this.name)
		var cy = getFloatByDefault(0.0, 'cy', registry, statement, this.name)
		var radius = getFloatByDefault(1.0, 'r', registry, statement, this.name)
		var sides = getFloatByDefault(24.0, 'sides', registry, statement, this.name)
		var angleIncrement = gDoublePi / sides
		var points = new Array(sides)
		var angle = 0.0
		for (var vertexIndex = 0; vertexIndex < sides; vertexIndex++) {
			points[vertexIndex] = [cx + Math.sin(angle) * radius, cy + Math.cos(angle) * radius]
			angle += angleIncrement
		}
		statement.tag = 'polygon'
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
			noticeByList(['No box could be generated for screen in generator2d.', statement])
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
		var points = []
		var beginAngle = Math.PI / 2.0 - overhangAngle
		var endAngle = 1.5 * Math.PI + overhangAngle
		var maximumIncrement = 2.0 * Math.PI / sides
		var deltaAngle = endAngle - beginAngle
		var arcSides = Math.ceil(deltaAngle / maximumIncrement - 0.001 * overhangAngle)
		var angleIncrement = deltaAngle / arcSides
		var halfAngleIncrement = 0.5 * angleIncrement
		beginAngle -= halfAngleIncrement
		endAngle += halfAngleIncrement + 0.001 * overhangAngle
		var outerRadius = radius / Math.cos(0.5 * angleIncrement)
		for (var pointAngle = beginAngle; pointAngle < endAngle; pointAngle += angleIncrement) {
			points.push([cx + Math.sin(pointAngle) * outerRadius, cy + Math.cos(pointAngle) * outerRadius])
		}
		var topY = cy + radius
		var deltaBegin = get2DSubtraction(points[0], points[1])
		var sagRunOverRise = Math.cos(sagAngle) / Math.sin(sagAngle)
		var segmentRunOverRise = deltaBegin[0] / deltaBegin[1]
		var approachRunOverRise = sagRunOverRise - segmentRunOverRise
		var topMinusSegment = topY - points[0][1]
		var topX = topMinusSegment * segmentRunOverRise + points[0][0]
		var aboveMinusTopY = (topX - cx) / approachRunOverRise
		var sagDeltaX = aboveMinusTopY * sagRunOverRise
		var aboveY = topY + aboveMinusTopY
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

var gGenerator2DProcessors = [
gCircle, gGrid, gImage, gLettering, gList, gOutline, gPolygon, gPolyline, gRectangle, gRegularPolygon, gScreen, gText, gVerticalHole]
