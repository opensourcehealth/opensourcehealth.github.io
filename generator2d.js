//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCharacterLengthMap = undefined
var gIntegerSet = new Set('-0123456789'.split(''))
var gLetteringMap = undefined
var gLetteringSet = undefined
var gPolygonExceptionSet = new Set(['checkIntersection', 'display', 'markerAbsolute', 'marker', 'outset', 'process'])
var gSpaceLength = 0.2

function addCharacterToMonad(character, monad) {
	monad.wordLengths.push({word:character, length:getTextLength(character) * getAttributeFloat('font-size', monad)})
}

function addPolygonsToGroup(polygons, registry, statement, copyKeys = true) {
	var idStart = statement.attributeMap.get('id') + '_polygon_'
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var polygonStatement = getStatementByParentTag(new Map(), 0, statement, 'polygon')
		getUniqueID(idStart + polygonIndex.toString(), registry, polygonStatement)
		if (copyKeys) {
			MapKit.copyMissingKeysExcept(polygonStatement.attributeMap, statement.attributeMap, gPolygonExceptionSet)
		}
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

function addRectangle(boundingBox, color, registry, statement, strokeWidthString) {
	var lowerPoint = boundingBox[0]
	var size = VectorFast.getSubtraction2D(boundingBox[1], lowerPoint)
	var xString = lowerPoint[0].toString()
	var yString = lowerPoint[1].toString()
	var rectangleAttributeMap = new Map([['x', xString], ['y', yString], ['width', size[0].toString()], ['height', size[1].toString()]])
	if (color != undefined) {
		rectangleAttributeMap.set('style', 'fill:' + color)
 	}
	rectangleAttributeMap.set('stroke-width', strokeWidthString)
	var rectangleStatement = getStatementByParentTag(rectangleAttributeMap, 0, statement, 'rect')
	getUniqueID(statement.attributeMap.get('id') + '_rect_x_' + xString + '_y_' + yString, registry, rectangleStatement)
}

function addTable(caption, colorPeriod, fontSize, headerColor,
registry, rowColor, statement, strokeWidth, table, tableAlign, tableStrokeWidth, textAnchor, x, y) {
	var columnRight = tableStrokeWidth
	var extraY = fontSize * 0.4
	var halfStrokeWidth = strokeWidth * 0.5
	var halfTableStrokeWidth = tableStrokeWidth * 0.5
	var extraYHalfStroke = extraY + halfTableStrokeWidth + halfStrokeWidth
	var maximumLength = table.headers.length
	var polylines = []
	var spaceFontLength = gSpaceLength * fontSize
	var doubleSpaceLength = spaceFontLength * 2.0
	var polylineTop = y + halfTableStrokeWidth
	var polylineY = polylineTop
	var strokeWidthString = tableStrokeWidth.toString()
	var textAdvance = 0.5 * (textAnchor == 'middle') + 1.0 * (textAnchor == 'end')
	var totalStrokeWidth = strokeWidth + tableStrokeWidth
	var yAddition = fontSize + totalStrokeWidth + extraY
	for (var row of table.rows) {
		maximumLength = Math.max(maximumLength, row.length)
	}

	var columnXs = new Array(maximumLength)
	var polylineXs = new Array(maximumLength)
	for (var columnIndex = 0; columnIndex < maximumLength; columnIndex++) {
		var columnTextLength = getColumnTextLength(columnIndex, registry, statement, table) * fontSize
		columnXs[columnIndex] = columnRight + textAdvance * columnTextLength + spaceFontLength + halfStrokeWidth
		columnRight += columnTextLength + totalStrokeWidth + doubleSpaceLength
		polylineXs[columnIndex] = columnRight
	}

	var offset = x - tableAlign * columnRight
	var polylineLeft = offset + halfTableStrokeWidth
	Vector.addArrayScalar(columnXs, offset)
	Vector.addArrayScalar(polylineXs, offset - halfTableStrokeWidth)
	var polylineRight = polylineXs[columnXs.length - 1]
	if (caption != undefined) {
		polylineY += yAddition
		var id = statement.attributeMap.get('id')
		var polylineMiddleString = ((polylineLeft + polylineRight) * 0.5).toString()
		addTextStatement(id, registry, statement, caption, 'middle', polylineMiddleString, (polylineY - extraYHalfStroke).toString())
	}

	if (table.headers.length > 0) {
		polylineY += yAddition
		addRectangle([[polylineLeft, polylineTop], [polylineRight, polylineY]], headerColor, registry, statement, strokeWidthString)
		addTextRow(columnXs, registry, table.headers, statement, textAnchor, polylineY - extraYHalfStroke)
		if (tableStrokeWidth > 0.0) {
			polylines.push([[polylineLeft, polylineY], [polylineRight, polylineY]])
		}
	}

	for (var rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
		var oldY = polylineY
		polylineY += yAddition
		if ((rowIndex - 1 + colorPeriod) % colorPeriod == 0) {
			addRectangle([[polylineLeft, oldY], [polylineRight, polylineY]], rowColor, registry, statement, strokeWidthString)
		}
		addTextRow(columnXs, registry, table.rows[rowIndex], statement, textAnchor, polylineY - extraYHalfStroke)
		if (tableStrokeWidth > 0.0) {
			polylines.push([[polylineLeft, polylineY], [polylineRight, polylineY]])
		}
	}

	if (polylines.length == 0) {
		return
	}

	polylines.push([[polylineLeft, polylineTop], [polylineRight, polylineTop]])
	polylines.push([[polylineLeft, polylineTop], [polylineLeft, polylineY]])
	for (var polylineX of polylineXs) {
		polylines.push([[polylineX, polylineTop], [polylineX, polylineY]])
	}

	var idStart = statement.attributeMap.get('id') + '_group_'
	var groupStatement = getStatementByParentTag(new Map([['stroke-width', tableStrokeWidth.toString()]]), 1, statement, 'g')
	getUniqueID(idStart, registry, groupStatement)
	addPolylinesToGroup(polylines, registry, groupStatement)
}

function addTextRow(columnXs, registry, row, statement, textAnchor, y) {
	var idStart = statement.attributeMap.get('id')
	var yString = y.toString()
	for (var columnIndex = 0; columnIndex < row.length; columnIndex++) {
		addTextStatement(idStart, registry, statement, row[columnIndex], textAnchor, columnXs[columnIndex].toString(), yString)
	}
}

function addTextStatement(idStart, registry, statement, text, textAnchor, xString, yString) {
	var textAttributeMap = new Map([['innerHTML', text], ['text-anchor', textAnchor], ['x', xString], ['y', yString]])
	var textStatement = getStatementByParentTag(textAttributeMap, 0, statement, 'text')
	getUniqueID(idStart + '_text_x_' + xString + '_y_' + yString, registry, textStatement)
}

function addTextStatementByMonad(monad, registry, statement, wordLengths) {
	var text = getJoinedWordByWordLengths(wordLengths)
	if (text.length == 0) {
		return
	}

	if (statement.texts != undefined) {
		statement.texts.push(text)
		return
	}

	var root = monad
	for (var count = 0; count < gLengthLimit; count++) {
		if (root.parent == undefined) {
			break
		}
		root = root.parent
	}

	var yString = getAttributeValue('y', monad)
	var spaceString = getAttributeValue('space', monad)
	if (spaceString != undefined) {
		// hair space is 8202
		text = text.replaceAll(' ', String.fromCharCode(parseInt(spaceString)))
	}

	var textLength = 0
	for (var wordLength of wordLengths) {
		textLength += wordLength.length
	}

	var x = getAttributeFloat('x', monad) + getAttributeFloat('dx', monad)
	var textAttributeMap = new Map([['innerHTML', text], ['x', x.toString()], ['y', yString]])
	var fontSize = getAttributeFloat('font-size', root)
	var localFontSize = getAttributeFloat('font-size', monad)
	yString = getNextYString(localFontSize, monad, yString)
	var writableWidth = getAttributeFloat('width', monad) - 2.0 * getAttributeFloat('padding', monad)
	textLength = getWithoutSpaceLength(fontSize, textLength, text)
	if (textLength > writableWidth) {
		localFontSize *= writableWidth / textLength
	}

	if (localFontSize != fontSize) {
		textAttributeMap.set('font-size', localFontSize.toString())
	}

	var localTextAnchor = getAttributeValue('text-anchor', monad)
	if (localTextAnchor != getAttributeValue('text-anchor', root)) {
		textAttributeMap.set('text-anchor', localTextAnchor)
	}

	var textStatement = getStatementByParentTag(textAttributeMap, 0, statement, 'text')
	var idStart = getAttributeValue('id', monad)
	var name = getAttributeValue('name', monad)
	if (name != undefined) {
		idStart += '_' + name
	}

	getUniqueID(idStart, registry, textStatement)
	wordLengths.length = 0
	setAttributeValue('y', monad, yString)
}

function addTextStatements(format, registry, statement, text) {
	var monad = new PlainMonad()
	monad.parent = format
	var monadMap = new Map([['b', BoldMonad], ['i', ItalicMonad], ['p', ParagraphMonad], ['sub', SubscriptMonad]])
	monadMap.set('sup', SuperscriptMonad)
	monadMap.set('table', TableMonad)
	var htmlMonadParser = {format:format, processor:processHTMLCharacter, monad:monad, monadMap:monadMap}
	var characters = text.split('')
	for (var character of characters) {
		htmlMonadParser.processor(character, htmlMonadParser, registry, statement)
	}

	monad = htmlMonadParser.monad
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		monad.close(registry, statement)
		if (monad.parent == undefined) {
			return
		}
		monad = monad.parent
		if (monad.close == undefined) {
			return
		}
	}
}

function arcFromTo(fromX, fromY, toX, toY, radius, numberOfSides) {
	return Polyline.arcFromToRadius(null, {parent:{variableMap:null}}, fromX, fromY, toX, toY, radius, true, numberOfSides)
}

function BoldMonad() {
	this.close = function(registry, statement) {
		var fontSize = getAttributeFloat('font-size', this)
		var joinedWord = getJoinedWordByWordLengths(this.wordLengths)
		var joinedLength = getTextLength(joinedWord) * fontSize
		var word = '<tspan font-weight = "bold" >' + joinedWord + '</tspan>'
		this.parent.wordLengths.push({word:word, length:joinedLength})
		this.wordLengths.length = 0
	}
	this.initialize = function(registry, statement) {
	}
}

//deprecated24
function cellX(registry, statement) {
	var parent = statement.parent
	var variableMap = getVariableMapByStatement(parent)
	var cellColumn = getVariableInt('grid_cellColumn', parent)
	if (cellColumn >= getIntByDefault('gridColumns', registry, statement, statement.tag, 1)) {
		cellColumn = 0
		variableMap.set('grid_cellColumn', '0')
		variableMap.set('grid_cellRow', (getVariableInt('grid_cellRow', parent) + 1).toString())
	}

	var x = cellColumn * getAttributeFloat('gridCellWidth', statement)
	variableMap.set('grid_cellColumn', (getVariableInt('grid_cellColumn', parent) + 1).toString())
	return x
}

//deprecated24
function cellY(registry, statement) {
	return getVariableInt('grid_cellRow', statement.parent) * getVariableFloat('gridCellHeight', statement.parent)
}

function closeByDYMultiplier(dyMultiplier, monad, registry, statement) {
	var fontSize = getAttributeFloat('font-size', monad)
	var dy = dyMultiplier * fontSize
	var joinedWord = getJoinedWordByWordLengths(monad.wordLengths)
	var joinedLength = getTextLength(joinedWord) * fontSize
	var word = '<tspan dx = "' + (0.05 * fontSize).toString() + '"  dy = "' + dy.toString() + '" font-size = "'
	word += (0.6 * fontSize).toString() + '">' + joinedWord + '</tspan><tspan dy = "' + (-dy).toString() + '">&#8203;</tspan>'
	monad.parent.wordLengths.push({word:word, length:joinedLength})
	monad.wordLengths.length = 0
}

function createCharacterPolylineMap() {
	gLetteringSet = new Set('3568ABKMNRVWX'.split(''))
	gLetteringMap = new Map()
	var bottomDiagonal = [[0, 1], [1, 0]]
	var bottomHorizontalSemicircle = arcFromTo(1, 0.5, 0, 0.5, 0.5)
	var bottomLeftArc = arcFromTo(1.0, 0.03, 0.5, 0, 0.8)
	var bottomLine = [[0, 0], [1, 0]]
	var bottomSemicircle = multiplyArraysByIndex(arcFromTo(0, 1, 0, 0, 0.5), 2.0, 0)
	var center = [[0.5, 1]]
	var diagonalDown = [[0, 2], [1, 0]]
	var diagonalUp = [[0, 0], [1, 2]]
	var leftBisectedPolyline = [[0, 0], [0, 1], [0, 2]]
	var leftLine = [[0, 0], [0, 2]]
	var leftTallSemicircle = multiplyArraysByIndex(arcFromTo(1.0, 0, 1.0, 2, 1.0), 0.5, 0)
	var lowLeftLine = [[0, 0.5], [0, 2]]
	var lowRightLine = [[1, 0.5], [1, 2]]
	var middleLine = [[0, 1], [1, 1]]
	var middleVerticalLine = [[0.5, 0], [0.5, 2]]
	var rightBisectedPolyline = [[1, 0], [1, 1], [1, 2]]
	var rightLine = [[1, 0], [1, 2]]
	var rightTallSemicircle = multiplyArraysByIndex(arcFromTo(1.0, 2, 1.0, 0, 1.0), 0.5, 0)
	var topDiagonal = [[0, 1], [1, 2]]
	var topLine = [[0, 2], [1, 2]]
	var topRightArc = arcFromTo(0.5, 2, 1.0, 1.97, 0.8)
	var topSemicircle = multiplyArraysByIndex(arcFromTo(0, 2, 0, 1, 0.5), 2.0, 0)
	gLetteringMap.set('.', [Polyline.arcCenterRadius(0, 0, 0.015, 0, 360, 12)])
	gLetteringMap.set('0', [leftTallSemicircle, rightTallSemicircle, Polyline.arcCenterRadius(0.5, 1, 0.015, 0, 360, 12)])
	gLetteringMap.set('1', [[[0.25, 0], [0.5, 0], [0.75, 0]], middleVerticalLine, [[0.25, 1.85], [0.5, 2]]])
	gLetteringMap.set('2', [Polyline.arcCenterRadius(0.5, 1.5, 0.5, 165, -45).concat(bottomLine)])
	var three = Polyline.arcCenterRadius(0.5, 1.5, 0.5, 165, -90).concat([[0.45, 1]]).concat(Polyline.arcCenterRadius(0.5, 0.5, 0.5, 90, -90))
	gLetteringMap.set('3', [three.concat(Polyline.arcCenterRadius(0.5, 1.5, 1.5, -90, -109))])
	gLetteringMap.set('4', [[[0.75,], [, 0.7], [, 2]], [[, 2], [, 0.7], [0.75,], [1,]]])
	gLetteringMap.set('5', [[[1, 2], [0.45, 2]].concat(arcFromTo(0.2, 1.27, 0.1, 0.03, -0.653))])
	var six = arcFromTo(0.005, 0.5, 1, 0.55, 0.4982).concat(arcFromTo(1, 0.5, 0.005, 0.45, 0.4982))
	gLetteringMap.set('6', [six.concat(arcFromTo(0.005, 0.45, 0.2, 1.6, 1.3)).concat(arcFromTo(0.2, 1.6, 1, 2, 1.05))])
	gLetteringMap.set('7', [arcFromTo(0.2, 0, 1, 2, 4).concat([[0, 2]])])
	var eight = center.concat(Polyline.arcCenterRadius(0.5, 1.5, 0.5, 240, -60)).concat(center)
	gLetteringMap.set('8', [eight.concat(Polyline.arcCenterRadius(0.5, 0.5, 0.5, 60, -240)).concat(center)])
	gLetteringMap.set('9', [[[0.25, 0], [0.5, 0], [0.75, 0]], middleVerticalLine, [[0.25, 1.85], [0.5, 2]]])
	gLetteringMap.set('A', [[[,], [0.14, 0.4], [0.7, 2], [0.8,], [1.36, 0.4], [1.5, 0]], [[0.14, 0.4], [1.36,]]])
	gLetteringMap.set('B', [bottomSemicircle, leftBisectedPolyline, topSemicircle])
	gLetteringMap.set('C', [bottomLeftArc, leftTallSemicircle, topRightArc])
	gLetteringMap.set('D', [arcFromTo(0, 2, 0, 0, 1), leftLine])
	gLetteringMap.set('E', [bottomLine, leftBisectedPolyline, middleLine, topLine])
	gLetteringMap.set('F', [leftBisectedPolyline, middleLine, topLine])
	gLetteringMap.set('G', [[[0.7, 0.9], [1.0, 0.9], [, 0.03]], bottomLeftArc, leftTallSemicircle, topRightArc])
	gLetteringMap.set('H', [leftBisectedPolyline, middleLine, rightBisectedPolyline])
	gLetteringMap.set('I', [[[0.25,], [0.5,], [0.75,]], middleVerticalLine, [[0.25, 2], [0.5,], [0.75,]]])
	gLetteringMap.set('J', [[[0.5, 2], [1,]], lowRightLine, bottomHorizontalSemicircle])
	gLetteringMap.set('K', [leftBisectedPolyline, bottomDiagonal, topDiagonal])
	gLetteringMap.set('L', [bottomLine, leftLine])
	gLetteringMap.set('M', [[[,], [, 2], [0.04,], [0.73, 0.8], [0.77,], [1.46, 2], [1.5,], [, 0]]])
	gLetteringMap.set('N', [leftLine.concat([[0.04, 2], [0.96, 0]]).concat(rightLine)])
	gLetteringMap.set('O', [leftTallSemicircle, rightTallSemicircle])
	gLetteringMap.set('P', [leftBisectedPolyline, topSemicircle])
	gLetteringMap.set('Q', [leftTallSemicircle, rightTallSemicircle, [[0.5,], [0.9, -0.15]]])
	gLetteringMap.set('R', [leftBisectedPolyline, topSemicircle, bottomDiagonal])
	var s = [arcFromTo(0.5, 0, 0.1, 0.03, 0.8), arcFromTo(0.853, 0.853, 0.5, 0, 0.5), [[0.853, 0.853], [0.147, 1.147]]]
	Vector.pushArray(s, [arcFromTo(0.147, 1.147, 0.5, 2, 0.5), arcFromTo(0.5, 2, 0.9, 1.97, 0.8)])
	gLetteringMap.set('S', s)
	gLetteringMap.set('T', [middleVerticalLine, [[, 2], [0.5, 2], [1,]]])
	gLetteringMap.set('U', [lowRightLine, bottomHorizontalSemicircle, lowLeftLine])
	gLetteringMap.set('V', [[[, 2], [0.48, 0], [0.52,], [1, 2]]])
	gLetteringMap.set('W', [[[, 2], [0.35, 0], [0.4,], [0.73, 1.4], [0.77,], [1.15, 0], [1.2, 0], [1.5, 2]]])
	gLetteringMap.set('X', [diagonalDown, diagonalUp])
	gLetteringMap.set('Y', [[[0.5,], [, 1]], [[0, 2], [0.5, 1], [1, 2]]])
	gLetteringMap.set('Z', [bottomLine, diagonalUp, topLine])
	gLetteringMap.set('z', [[[, 1.28], [0.64,], [0, 0], [0.64,]]])
	for (var polylines of gLetteringMap.values()) {
		for (var polyline of polylines) {
			var oldPoint = [0, 0]
			for (var point of polyline) {
				for (var vertexIndex = 0; vertexIndex < 2; vertexIndex++) {
					if (point[vertexIndex] == undefined) {
						point[vertexIndex] = oldPoint[vertexIndex]
					}
				}
				oldPoint = point
			}
		}
	}
}

function getAnchorFontParent(registry, statement) {
	var attributeMap = new Map()
	attributeMap.set('font-size', getFloatByDefault('font-size', registry, statement, statement.tag, 12.0).toString())
	attributeMap.set('id', statement.attributeMap.get('id'))
	attributeMap.set('overflow', getAttributeValue('overflow', statement))
	attributeMap.set('space', getAttributeValue('space', statement))
	attributeMap.set(getValueByKeyDefault('text-anchor', registry, statement, statement.tag, 'middle'))
	return {attributeMap:attributeMap}
}

function getCellTextLength(columnIndex, registry, row, statement) {
	if (row[columnIndex].indexOf('<') != -1) {
		statement.texts = []
		addTextStatements(getTextFormatMonad(registry, statement), registry, statement, row[columnIndex])
		row[columnIndex] = statement.texts.join('')
		statement.texts = undefined
	}

	return getTextLength(getUnbracketedText(row[columnIndex]))
}

function getColumnTextLength(columnIndex, registry, statement, table) {
	var textLength = 0.0
	if (columnIndex < table.headers.length) {
		textLength = getCellTextLength(columnIndex, registry, table.headers, statement) 
	}

	for (var row of table.rows) {
		if (columnIndex < row.length) {
			textLength = Math.max(textLength, getCellTextLength(columnIndex, registry, row, statement))
		}
	}

	return textLength
}

function getJoinedWordByWordLengths(wordLengths) {
	var joinedWords = new Array(wordLengths.length)
	for (var wordLengthIndex = 0; wordLengthIndex < wordLengths.length; wordLengthIndex++) {
		joinedWords[wordLengthIndex] = wordLengths[wordLengthIndex].word
	}

	return joinedWords.join('')
}

function getLetteringOutlines(fontSize, isIsland, strokeWidth, text, textAlign) {
	var betweenCharacter = 0.1 * fontSize + strokeWidth
	var halfHeight = fontSize * 0.5
	var averageAdvance = halfHeight + betweenCharacter
	var letteringOutlines = []
	var maximumX = 0
	var outset = strokeWidth / fontSize
	var outsets = [[outset, outset]]
	var x = 0
	if (gLetteringMap == undefined) {
		createCharacterPolylineMap()
	}

	for (var character of text) {
		var polylines = gLetteringMap.get(character)
		if (polylines == undefined) {
			x += averageAdvance
		}
		else {
			var outlines = getOutlines(null, null, gLetteringSet.has(character), true, outsets, polylines, null)
			if (!isIsland) {
				outlines = outlines.filter(Polygon.isCounterclockwise)
			}
			var polygon = getConnectedPolygon(outlines)
			polygon = Polyline.copy(polygon)
			Polyline.multiply2DsScalar(polygon, halfHeight)
			var boundingX = getBoundingXByPolygons([polygon])
			x -= boundingX[0]
			Polyline.addByIndex(polygon, x, 0)
			letteringOutlines.push(polygon)
			x += boundingX[1]
			maximumX = x
			x += betweenCharacter
		}
	}

	Polyline.addArrayByIndex(letteringOutlines, -textAlign * maximumX, 0)
	return letteringOutlines
}

function getMarker(key, outsets, registry, statement) {
	var marker = getPointsByKey(key, registry, statement)
	if (!Vector.isEmpty(marker)) {
		return marker
	}

	if (getBooleanByStatement(key + 'Semicircle', registry, statement) != true) {
		return undefined
	}

	var sides = Value.getValueDefault(getFloatByStatement(key + 'Sides', registry, statement), 24)
	return Polyline.arcCenterRadius(undefined, undefined, outsets[0][0], 0.0, 180.0, sides, false, false)
}

function getNextYString(fontSize, monad, yString) {
	var lineHeightString = getAttributeValue('lineHeight', monad)
	if (lineHeightString != undefined) {
		fontSize = parseFloat(lineHeightString)
	}

	return (parseFloat(yString) + fontSize).toString()
}

function getTextFormatMonad(registry, statement) {
	var monad = getAnchorFontParent(registry, statement)
	var attributeMap = monad.attributeMap
	attributeMap.set('padding', getFloatByDefault('padding', registry, statement, statement.tag, 0.0).toString())
	attributeMap.set('width', getFloatByDefault('width', registry, statement, statement.tag, 100.0).toString())
	var lineHeight = getFloatByStatement('lineHeight', registry, statement)
	if (lineHeight != undefined) {
		attributeMap.set('lineHeight', lineHeight.toString())
	}

	attributeMap.set('dx', getFloatByDefault('dx', registry, statement, statement.tag, 0.0).toString())
	attributeMap.set('dy', getFloatByDefault('dy', registry, statement, statement.tag, 0.0).toString())
	attributeMap.set('x', getFloatByDefault('x', registry, statement, statement.tag, 0.0).toString())
	attributeMap.set('y', getFloatByDefault('y', registry, statement, statement.tag, 0.0).toString())
	return monad
}

function getTextLength(text) {
	if (gCharacterLengthMap == undefined) {
		gCharacterLengthMap = new Map()
		var characterLengths = 'a 435 b 500 c 444 d 499 e 444 f 373 g 467 h 498 i 278'.split(' ')
		Vector.pushArray(characterLengths, 'j 348 k 513 l 258 m 779 n 489 o 491 p 500 q 499 r 345'.split(' '))
		Vector.pushArray(characterLengths, 's 367 t 283 u 490 v 468 w 683 x 482 y 471 z 417'.split(' '))
		Vector.pushArray(characterLengths, 'A 721 B 631 C 670 D 719 E 610 F 564 G 722 H 714 I 327'.split(' '))
		Vector.pushArray(characterLengths, 'J 385 K 709 L 611 M 881 N 725 O 724 P 576 Q 723 R 667'.split(' '))
		Vector.pushArray(characterLengths, 'S 529 T 606 U 721 V 701 W 947 X 714 Y 701 Z 613'.split(' '))
		Vector.pushArray(characterLengths, '0 500 1 500 2 500 3 500 4 500 5 500 6 500 7 500 8 500 9 500'.split(' '))
		Vector.pushArray(characterLengths, ') 333 ! 333 @ 865 # 500 $ 500 % 833 ^ 469 & 778 * 500 ( 333'.split(' '))
		Vector.pushArray(characterLengths, ', 250 < 564 . 250 > 564 / 296 ? 444 ; 250 : 250 [ 333'.split(' '))
		Vector.pushArray(characterLengths, '{ 480 ] 333 } 480 | 200 - 333 _ 500 = 564 + 564 ` 250 ~ 500'.split(' '))
		for (var characterIndex = 0; characterIndex < characterLengths.length; characterIndex += 2) {
			gCharacterLengthMap.set(characterLengths[characterIndex], 0.001 * parseFloat(characterLengths[characterIndex + 1]))
		}
		gCharacterLengthMap.set(' ', gSpaceLength)
		gCharacterLengthMap.set("'", 0.266)
		gCharacterLengthMap.set('"', 0.332)
	}

	var textLength = 0.0
	for (var character of text) {
		if (gCharacterLengthMap.has(character)) {
			textLength += gCharacterLengthMap.get(character)
		}
		else {
			textLength += 0.515
		}
	}

	return textLength
}

function getWithoutSpaceLength(fontSize, length, text) {
	if (text[text.length - 1] == ' ') {
		return length - gSpaceLength * fontSize
	}

	return length
}

function gridCellX(registry, statement) {
	var parent = statement.parent
	var variableMap = getVariableMapByStatement(parent)
	var cellColumn = getVariableInt('grid_cellColumn', parent)
	if (cellColumn >= getIntByDefault('gridColumns', registry, statement, statement.tag, 1)) {
		cellColumn = 0
		variableMap.set('grid_cellColumn', '0')
		variableMap.set('grid_cellRow', (getVariableInt('grid_cellRow', parent) + 1).toString())
	}

	var x = cellColumn * getAttributeFloat('gridCellWidth', statement)
	variableMap.set('grid_cellColumn', (getVariableInt('grid_cellColumn', parent) + 1).toString())
	return x
}

function gridCellY(registry, statement) {
	return getVariableInt('grid_cellRow', statement.parent) * getVariableFloat('gridCellHeight', statement.parent)
}

function ItalicMonad() {
	this.close = function(registry, statement) {
		var fontSize = getAttributeFloat('font-size', this)
		var joinedWord = getJoinedWordByWordLengths(this.wordLengths)
		var joinedLength = getTextLength(joinedWord) * fontSize
		var word = '<tspan font-style = "italic" >' + joinedWord + '</tspan>'
		this.parent.wordLengths.push({word:word, length:joinedLength})
		this.wordLengths.length = 0
	}
	this.initialize = function(registry, statement) {
	}
}

function lineIsTooLong(cellWidth, fontSize, line) {
	return getTextLength(line) * fontSize > cellWidth
}

function ParagraphMonad() {
	this.close = function(registry, statement) {
		var shrink = getAttributeValue('overflow', this) == 'shrink'
		var textAnchor = getAttributeValue('text-anchor', this)
		var fontSize = getAttributeFloat('font-size', this)
		var padding = getAttributeFloat('padding', this)
		var width = getAttributeFloat('width', this)
		var writableWidth = width - 2.0 * padding
		var x = padding
		if (textAnchor == 'end' ) {
			x = width - padding
		}
		else {
			if (textAnchor == 'middle' ) {
				x = 0.5 * width
			}
		}

		this.attributeMap.set('x', x.toString())
		var groupedWordLengths = []
		var oldLength = 0.0
		var oldWordLengths = []
		var lastCharacter = ' '
		var lastWordLength = undefined
		for (var wordLength of this.wordLengths) {
			var character = wordLength.word
			if (lastCharacter == ' ' && character != ' ') {
				lastWordLength = undefined
			}
			if (lastWordLength == undefined) {
				lastWordLength = {word:[], length:0.0}
				groupedWordLengths.push(lastWordLength)
			}
			lastWordLength.word.push(character)
			lastWordLength.length += wordLength.length
			lastCharacter = character
		}

		for (var wordLength of groupedWordLengths) {
			wordLength.word = wordLength.word.join('')
			oldLength += wordLength.length
			oldWordLengths.push(wordLength)
			if (getWithoutSpaceLength(fontSize, oldLength, wordLength.word) > writableWidth) {
				var statementWordLengths = oldWordLengths
				if (oldWordLengths.length == 1 || shrink) {
					oldLength = 0.0
					oldWordLengths = []
				}
				else {
					statementWordLengths = oldWordLengths.slice(0)
					statementWordLengths.pop()
					oldLength = wordLength.length
					oldWordLengths = [wordLength]
				}
				addTextStatementByMonad(this, registry, statement, statementWordLengths)
			}
		}

		var end = getAttributeValue('end', this)
		if (end != undefined && oldWordLengths.length > 0) {
			end = ' ' + end
			var remainingLength = writableWidth
			for (var oldWordLength of oldWordLengths) {
				remainingLength -= oldWordLength.length
			}
			var endingWord = ''
			var textLength = 0.0
			for (var characterIndex = 0; characterIndex < gLengthLimit; characterIndex++) {
				var character = end[characterIndex % end.length]
				textLength += getTextLength(character) * fontSize
				endingWord += character
				if (textLength >= remainingLength) {
					oldWordLengths.push({length:textLength, word:endingWord.slice(0, endingWord.length - 1)})
					break
				}
			}
		}

		addTextStatementByMonad(this, registry, statement, oldWordLengths)
		var yString = getAttributeValue('y', this)
		var marginString = getAttributeValue('margin', this)
		if (marginString == undefined) {
			yString = getNextYString(getAttributeFloat('font-size', this), this, yString)
		}
		else {
			yString = (parseFloat(yString) + parseFloat(marginString)).toString()
		}

		setAttributeValue('y', this, yString)
	}
	this.initialize = function(registry, statement) {
		this.parent.close(registry, statement)
	}
}


function PlainMonad() {
	this.close = function(registry, statement) {
		addTextStatementByMonad(this, registry, statement, this.wordLengths)
	}
	this.wordLengths = []
}

function processAfterTagCharacter(character, htmlMonadParser, registry, statement) {
	if (gAlphabetSet.has(character)) {
		htmlMonadParser.tagCharacters = []
		htmlMonadParser.processor = processTagCharacter
		processTagCharacter(character, htmlMonadParser, registry, statement)
		return
	}

	if (character == '/') {
		htmlMonadParser.monad.close(registry, statement)
		htmlMonadParser.monad = htmlMonadParser.monad.parent
		htmlMonadParser.processor = processEnd
		processEnd(character, htmlMonadParser, registry, statement)
		return
	}

	htmlMonadParser.processor = processHTMLCharacter
	addCharacterToMonad('<', htmlMonadParser.monad)
	addCharacterToMonad(character, htmlMonadParser.monad)
}

function processEnd(character, htmlMonadParser, registry, statement) {
	if (character == '>') {
		htmlMonadParser.processor = processHTMLCharacter
	}
}

function processHTMLCharacter(character, htmlMonadParser, registry, statement) {
	if (character == '<') {
		htmlMonadParser.processor = processAfterTagCharacter
		return
	}

	addCharacterToMonad(character, htmlMonadParser.monad)
}

function processTagAttributes(character, htmlMonadParser, registry, statement) {
	if (character == '>') {
		htmlMonadParser.monad.attributeMap = new Map(getAttributes(getQuoteSeparatedSnippets(htmlMonadParser.tagCharacters.join(''))))
		htmlMonadParser.processor = processHTMLCharacter
		return
	}

	htmlMonadParser.tagCharacters.push(character)
}

function processTagCharacter(character, htmlMonadParser, registry, statement) {
	if (character == ' ') {
		setNextMonad(htmlMonadParser, registry, statement)
		htmlMonadParser.tagCharacters = []
		htmlMonadParser.processor = processTagAttributes
		return
	}

	if (character == '>') {
		setNextMonad(htmlMonadParser, registry, statement)
		htmlMonadParser.processor = processHTMLCharacter
		return
	}

	htmlMonadParser.tagCharacters.push(character)
}

function setFloatByKeyStatement(attributeMap, key, registry, statement, valueDefault) {
	attributeMap.set(key, getFloatByDefault(key, registry, statement, statement.tag, valueDefault).toString())
}

function setNextMonad(htmlMonadParser, registry, statement) {
	var nextMonadConstructor = TSpanMonad
	var tag = htmlMonadParser.tagCharacters.join('')
	if (htmlMonadParser.monadMap.has(tag)) {
		nextMonadConstructor = htmlMonadParser.monadMap.get(tag)
	}

	var nextMonad = new nextMonadConstructor()
	nextMonad.attributeMap = new Map()
	nextMonad.parent = htmlMonadParser.monad
	nextMonad.wordLengths = []
	nextMonad.initialize(registry, statement)
	htmlMonadParser.monad = nextMonad
}

function SuperscriptMonad() {
	this.close = function(registry, statement) {
		closeByDYMultiplier(-0.4, this, registry, statement)
	}
	this.initialize = function(registry, statement) {
	}
}

function SubscriptMonad() {
	this.close = function(registry, statement) {
		closeByDYMultiplier(0.15, this, registry, statement)
	}
	this.initialize = function(registry, statement) {
	}
}

function TableMonad() {
	this.close = function(registry, statement) {
		var src = getAttributeValue('src', this)
		if (!registry.idMap.has(src)) {
			return
		}
		var fontSize = getAttributeFloat('font-size', this)
		var sourceStatement = registry.idMap.get(src)
		var sourceChildren = sourceStatement.children
		var numberOfColumns = parseInt(Value.getValueDefault(getAttributeValue('columns', this), '1'))
		var x = getAttributeFloat('padding', this)
		var numberOfRows = parseInt(Value.getValueDefault(getAttributeValue('rows', this), '1'))
		var numberOfCells = Math.min(numberOfColumns * numberOfRows, sourceChildren.length)
		var width = getAttributeFloat('width', this)
		var remainingLength = sourceChildren.length - numberOfCells
		var tableChildren = sourceChildren.slice(remainingLength)
		tableChildren.reverse()
		sourceChildren.length = remainingLength
		var endIndex = Math.ceil(1.0 * numberOfCells / numberOfColumns)
		var rowIndex = 0
		var originalYString = getAttributeValue('y', this)
		var xAdvance = width / numberOfColumns
		var yString = originalYString
		Vector.pushArray(statement.children, tableChildren)
		for (var cellIndex = 0; cellIndex < numberOfCells; cellIndex++) {
			var child = tableChildren[cellIndex]
			if (rowIndex == endIndex) {
				rowIndex = 0
				numberOfColumns--
				x += xAdvance
				yString = originalYString
				endIndex = Math.ceil(1.0 * (numberOfCells - cellIndex) / numberOfColumns)
			}
			child.attributeMap.set('x', x.toString())
			child.attributeMap.set('y', yString)
			yString = getNextYString(fontSize, this, yString)
			rowIndex++
		}
	}
	this.initialize = function(registry, statement) {
		this.parent.close(registry, statement)
	}
}

function TSpanMonad() {
	this.close = function(registry, statement) {
		var fontSize = getAttributeFloat('font-size', this)
		var joinedWord = getJoinedWordByWordLengths(this.wordLengths)
		var joinedLength = getTextLength(joinedWord) * fontSize
		var word = '<tspan'
		for (var entry of this.attributeMap.entries()) {
			word += ' ' + entry[0] + '="' + entry[1] + '"'
		}
		word += ' >' + joinedWord + '</tspan>'
		this.parent.wordLengths.push({word:word, length:joinedLength})
		this.wordLengths.length = 0
	}
	this.initialize = function(registry, statement) {
	}
}

var gFormattedText = {
	processStatement: function(registry, statement) {
		var formattedTextInputArea = undefined
		var attributeMap = statement.attributeMap
		var id = attributeMap.get('id')
		var text = ''
		if (getBooleanByDefault('input', registry, statement, this.tag, false)) {
			formattedTextInputArea = getInputArea('Formatted Text - ' + id)
			text = formattedTextInputArea.value
			if (text != '') {
				var textPhrases = text.replaceAll('\n', " ").replaceAll('"', "'").split('<p>')
				for (var textPhraseIndex = 0; textPhraseIndex < textPhrases.length; textPhraseIndex++) {
					var textPhrase = textPhrases[textPhraseIndex].trim()
					var indexOfEnd = textPhrase.indexOf('</p>')
					if (indexOfEnd == -1) {
						textPhrases[textPhraseIndex] = undefined
					}
					else {
						textPhrase = textPhrase.slice(0, indexOfEnd)
						if (textPhrase.indexOf('</') != -1) {
							var previousCharacter = ' '
							textPhrase = textPhrase.split('')
							var bracketDepth = 0
							var tagDepth = 0
							for (var characterIndex = 0; characterIndex < textPhrase.length; characterIndex++) {
								var character = textPhrase[characterIndex]
								var nextCharacter = ' '
								if (characterIndex + 1 < textPhrase.length) {
									nextCharacter = textPhrase[characterIndex + 1]
								}
								if (character == '<') {
									if (nextCharacter != '/' && nextCharacter != ' ') {
										bracketDepth = 1
										tagDepth += 1
									}
								}
								if (character == '<') {
									if (nextCharacter == '/') {
										tagDepth -= 1
									}
								}
								if (bracketDepth > 0) {
									textPhrase[characterIndex] = undefined
								}
								if (character == '>') {
									if (previousCharacter != ' ') {
										if (tagDepth == 0) {
											bracketDepth = 0
										}
									}
								}
								previousCharacter = character
							}
							Vector.removeUndefineds(textPhrase)
							textPhrase = textPhrase.join('')
						}
						textPhrases[textPhraseIndex] = textPhrase
					}
				}
				Vector.removeUndefineds(textPhrases)
				text = '<p> ' + textPhrases.join(' </p> <p> ') + ' </p>'
			}
		}
		if (text == '') {
			if (attributeMap.has('text')) {
				text = attributeMap.get('text')
				attributeMap.set('text', text.replaceAll( '<', '&lt;'))
				text = text.replaceAll('&lt;', '<')
			}
		}
		else {
			if (getBooleanByDefault('updateStatement', registry, statement, this.tag, false)) {
				addEntriesToStatementLine([['text', '" ' + text + ' "']], registry, statement)
				if (formattedTextInputArea != undefined) {
					formattedTextInputArea.value = ''
				}
			}
		}
		if (text == '') {
			printCaller(['No text could be found for formattedText in generator2d.', statement])
			return
		}
		addTextStatements(getTextFormatMonad(registry, statement), registry, statement, text)
		convertToGroup(statement)
		if (getBooleanByDefault('hideReverse', registry, statement, this.tag, false)) {
			if (!attributeMap.has('display')) {
				attributeMap.set('display', 'none')
			}
			statement.children.reverse()
		}
	},
	tag: 'formattedText'
}

var gFractal2D = {
	processStatement: function(registry, statement) {
		var view = new ViewFractal2D()
		view.blueFrequency = getFloatByDefault('blueFrequency', registry, statement, this.tag, 0.89)
		view.escapeRadius = getFloatByDefault('escapeRadius', registry, statement, this.tag, 2.0)
		view.changePixels = getIntByDefault('changePixels', registry, statement, this.tag, 10000)
		view.greenFrequency = getFloatByDefault('greenFrequency', registry, statement, this.tag, 0.11)
		view.id = statement.attributeMap.get('id')
		view.iterations = getIntByDefault('iterations', registry, statement, this.tag, 200)
		view.pixelSize = getIntByDefault('pixelSize', registry, statement, this.tag, 1)
		view.redFrequency = getFloatByDefault('redFrequency', registry, statement, this.tag, 0.03)
		view.type = statement.attributeMap.get('type')
		view.x = getFloatByDefault('x', registry, statement, this.tag, 0.0)
		view.y = getFloatByDefault('y', registry, statement, this.tag, 0.0)
		view.zoom = getFloatByDefault('zoom', registry, statement, this.tag, 1.0)
		var controlBoxHeight = 2 * viewCanvas.controlWidth + 6 * viewCanvas.wideHeight + 3.5 * viewCanvas.textSpace
		viewBroker.minimumHeight = Math.max(viewBroker.minimumHeight, controlBoxHeight)
		registry.views.push(view)
	},
	tag: 'fractal2D'
}

var gGrid = {
	initialize: function() {
		gParentFirstSet.add(this.tag)

//deprecated24
		addFunctionToMap(cellX, gMapR)
		addFunctionToMap(cellY, gMapR)

		addFunctionToMap(gridCellX, gMapR)
		addFunctionToMap(gridCellY, gMapR)
	},
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var parent = statement.parent
		var cellHeight = getFloatByDefault('gridCellHeight', registry, statement, this.tag, 100.0)
		var cellWidth = getFloatByDefault('gridCellWidth', registry, statement, this.tag, 100.0)
		var columns = getIntByDefault('gridColumns', registry, statement, this.tag, 1)
		var cornerMultiplier = getFloatByDefault('corner', registry, statement, this.tag, 1.0)
		var rows = getIntByDefault('gridRows', registry, statement, this.tag, 1)
		var lineLength = getFloatByDefault('lineLength', registry, statement, this.tag, 2.0)
		var cornerLength = getFloatByDefault('cornerLength', registry, statement, this.tag, lineLength)
		var edgeLength = getFloatByDefault('edgeLength', registry, statement, this.tag, lineLength)
		var insideLength = getFloatByDefault('insideLength', registry, statement, this.tag, lineLength)
		var outsideLength = getFloatByDefault('outsideLength', registry, statement, this.tag, 0.0)
		var gridHeight = cellHeight * rows
		var gridWidth = cellWidth * columns
		var variableMap = getVariableMapByStatement(parent)
		variableMap.set('grid_cellColumn', '0')
		variableMap.set('grid_cellRow', '0')
		var groupMap = new Map(statement.attributeMap)
		statement.attributeMap.delete('style')
		if (cornerLength * edgeLength * insideLength == 0.0) {
			return
		}

		var gridHeightPlus = gridHeight + outsideLength
		var gridWidthPlus = gridWidth + outsideLength
		var groupStatement = getStatementByParentTag(groupMap, 1, statement, 'g')
		groupStatement.attributeMap.delete('transform')
		getUniqueID('gridGroup', registry, groupStatement)
		var polylines = []
		if (cornerLength != 0.0) {
			polylines.push([[-outsideLength, 0], [cornerLength, 0]])
			polylines.push([[gridWidth - cornerLength, 0], [gridWidthPlus, 0]])
			polylines.push([[-outsideLength, gridHeight], [cornerLength, gridHeight]])
			polylines.push([[gridWidth - cornerLength, gridHeight], [gridWidthPlus, gridHeight]])
			polylines.push([[0, -outsideLength], [0, cornerLength]])
			polylines.push([[gridWidth, -outsideLength], [gridWidth, cornerLength]])
			polylines.push([[0, gridHeight - cornerLength], [0, gridHeightPlus]])
			polylines.push([[gridWidth, gridHeight - cornerLength], [gridWidth, gridHeightPlus]])
		}

		if (edgeLength != 0.0) {
			var x = 0.0
			for (var xIndex = 1; xIndex < columns; xIndex++) {
				x += cellWidth
				polylines.push([[x, -outsideLength], [x, edgeLength]])
				polylines.push([[x, gridHeight - edgeLength], [x, gridHeightPlus]])
				polylines.push([[x - edgeLength, 0], [x + edgeLength, 0]])
				polylines.push([[x - edgeLength, gridHeight], [x + edgeLength, gridHeight]])
			}
			var y = 0.0
			for (var yIndex = 1; yIndex < rows; yIndex++) {
				y += cellHeight
				polylines.push([[-outsideLength, y], [edgeLength, y]])
				polylines.push([[gridWidth - edgeLength, y], [gridWidthPlus, y]])
				polylines.push([[0, y - edgeLength], [0, y + edgeLength]])
				polylines.push([[gridWidth, y - edgeLength], [gridWidth, y + edgeLength]])
			}
		}

		if (insideLength != 0.0) {
			var y = 0.0
			for (var yIndex = 1; yIndex < rows; yIndex++) {
				y += cellHeight
				var x = 0.0
				for (var xIndex = 1; xIndex < columns; xIndex++) {
					x += cellWidth
					polylines.push([[x - insideLength, y], [x + insideLength, y]])
					polylines.push([[x, y - insideLength], [x, y + insideLength]])
				}
			}
		}

		addPolylinesToGroup(polylines, registry, groupStatement)
	},
	tag: 'grid'
}

var gImage = {
	processStatement: function(registry, statement) {
		getPointsExcept(null, registry, statement)
	},
	tag: 'image'
}

var gLettering = {
	processStatement:function(registry, statement) {
		var fontHeight = getFloatByDefault('fontHeight', registry, statement, this.tag, 12.0)
		var fontSize = getFloatByDefault('font-size', registry, statement, this.tag, fontHeight)
		var isIsland = getBooleanByDefault('island', registry, statement, this.tag, true)
		var strokeWidth = getFloatByDefault('strokeWidth', registry, statement, this.tag, 1.5)
		var text = getValueByKeyDefault('text', registry, statement, this.tag, 'TEXT')
		var textAlign = getAlignment('textAlign', registry, statement, this.tag)
		var outlines = getLetteringOutlines(fontSize, isIsland, strokeWidth, text, textAlign)
		if (outlines.length == 0) {
			printCaller(['No outlines could be generated for lettering in generator2d.', statement])
			return
		}
		convertToGroup(statement)
		addPolygonsToGroup(outlines, registry, statement, false)
	},
	tag: 'lettering'
}

var gList = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var children = []
		var parent = statement.parent
		var variableValue = getVariableValue('list_children', parent)
		if (!Vector.isEmpty(variableValue)) {
			children = variableValue.split(' ')
		}

		var padding = getFloatByDefault('listPadding', registry, statement, this.tag, 2.0)
		padding = getFloatByDefault('listMargin', registry, statement, this.tag, padding)
		var transform = Value.getValueDefault(getAttributeValue('listTransform', statement), attributeMap.get('transform'))
		var width = getFloatByDefault('gridCellWidth', registry, statement, this.tag, 0.0)
		var x = 0.5 * width
		if (!Vector.isEmpty(transform)) {
			attributeMap.set('transform', transform)
		}

		if (attributeMap.has('function')) {
			functionString = attributeMap.get('function') + '('
			if (attributeMap.has('arguments')) {
				functionString += attributeMap.get('arguments')
			}
			functionString += ')'
			getValueByEquation(registry, statement, functionString)
		}

		var anchorFontParent = getAnchorFontParent(registry, statement)
		var parentAttributeMap = anchorFontParent.attributeMap
		setFloatByKeyStatement(parentAttributeMap, 'dx', registry, statement, 0.0)
		setFloatByKeyStatement(parentAttributeMap, 'dy', registry, statement, 0.0)
		setFloatByKeyStatement(parentAttributeMap, 'padding', registry, statement, padding)
		setFloatByKeyStatement(parentAttributeMap, 'width', registry, statement, width)
		setFloatByKeyStatement(parentAttributeMap, 'x', registry, statement, 0.5 * width)
		setFloatByKeyStatement(parentAttributeMap, 'y', registry, statement, 0.0)
		if (registry.textFormatMapMap == undefined) {
			printCaller(['No text formats could be found for list in generator2d.', statement])
			return
		}

		if (registry.textFormatMapMap.size == 0) {
			printCaller(['No text formats could be found for list in generator2d.', statement])
			return
		}

		Vector.replaceAllKeys(attributeMap, '&lt;', '<')
		for (var formatMapValue of registry.textFormatMapMap.values()) {
			var formatID = formatMapValue.get('id')
			if (attributeMap.has(formatID)) {
				var formatMonad = {attributeMap:new Map(formatMapValue), parent:anchorFontParent}
				var value = attributeMap.get(formatID)
				value = Value.getValueDefault(getVariableValue(value, statement), value)
				var key = getAttributeValue('key', formatMonad)
				if (key != undefined) {
					value = value.trim()
					if (value.length == 0) {
						if (attributeMap.has(key)) {
							value = attributeMap.get(key)
						}
					}
				}
				var lower = getAttributeValue('lower', formatMonad)
				if (lower != undefined) {
					if (getBooleanByString(lower)) {
						value = value.toLowerCase()
					}
				}
				var compressed = getAttributeValue('compressed', formatMonad)
				if (compressed != undefined) {
					if (getBooleanByString(compressed)) {
						value = value.trim().replaceAll(' ', '')
					}
				}
				var prefix = getAttributeValue('prefix', formatMonad)
				if (prefix != undefined) {
					value = prefix + value
				}
				var suffix = getAttributeValue('suffix', formatMonad)
				if (suffix != undefined) {
					if (suffix == '$colon') {
						suffix = ':'
					}
					else {
						if (suffix.startsWith('.') && value.lastIndexOf('.') > value.length - 6) {
							suffix = ''
						}
					}
					value += suffix
				}
				attributeMap.set(formatID, value)
				if (formatMonad.attributeMap.has('image')) {
					var x = getAttributeFloatByDefault('x', formatMonad, 0.0) + getAttributeFloatByDefault('dx', formatMonad, 0.0)
					var y = getAttributeFloatByDefault('y', formatMonad, 0.0) + getAttributeFloatByDefault('dy', formatMonad, 0.0)
					var imageMap = new Map([['href', value.replaceAll(' ', '')], ['x', x.toString()], ['y', y.toString()]])
					MapKit.setMapIfDefined('height', imageMap, getAttributeValue('height', formatMonad))
					MapKit.setMapIfDefined('width', imageMap, getAttributeValue('width', formatMonad))
					var imageStatement = getStatementByParentTag(imageMap, 0, statement, 'image')
					var idStart = getAttributeValue('id', formatMonad)
					if (value != undefined) {
						idStart += '_' + value
					}
					getUniqueID(idStart, registry, imageStatement)
				}
				else {
					addTextStatements(formatMonad, registry, statement, value)
					var words = value.split(' ')
					for (var wordIndex = words.length - 1; wordIndex > -1; wordIndex--) {
						var word = words[wordIndex]
						if (word.startsWith('<') || word.endsWith('>')) {
							words.splice(wordIndex, 1)
						}
					}
					attributeMap.set(formatID, words.join(' '))
				}
			}
		}

		convertToGroup(statement)
		var childCount = 0
		for (var childID of children) {
			childID = childID.trim()
			if (registry.idMap.has(childID)) {
				var childStatement = registry.idMap.get(childID)
				var childCopy = getStatementByParentTag(new Map(), childStatement.nestingIncrement, statement, childStatement.tag)
				getUniqueID(attributeMap.get('id') + '_' + childCount, registry, childCopy)
				copyStatementRecursively(registry, childCopy, childStatement)
				statement.children.push(childCopy)
				childCount++
			}
		}

		Vector.replaceAllKeys(attributeMap, '<', '&lt;')
	},
	tag: 'list'
}

var gMap = {
addText: function(registry, statement, textStatement) {
	if (textStatement.tag != 'text') {
		return
	}

	var innerHTML = textStatement.attributeMap.get('innerHTML')
	if (innerHTML == undefined) {
		return
	}

	var cellStrings = innerHTML.split(' ').filter(lengthCheck)
	for (var cellString of cellStrings) {
		var cells = cellString.split(',').filter(lengthCheck)
		if (cells.length > 0) {
			var attributeMap = undefined
			var groupStatement = statement
			if (cells.length > 1) {
				attributeMap = new Map()
				groupStatement = getStatementByParentTag(attributeMap, 1, statement, 'g')
				getStatementID(registry, groupStatement)
			}
			for (var cell of cells) {
				if (registry.idMap.has(cell)) {
					var workStatement = registry.idMap.get(cell)
					var child = getStatementByParentTag(new Map(), workStatement.nestingIncrement, groupStatement, workStatement.tag)
					getStatementID(registry, child)
					copyStatementRecursively(registry, child, workStatement)
					if (attributeMap == undefined) {
						attributeMap = child.attributeMap
					}
				}
			}
			var translateString = 'translate(' + this.translate.toString() + ')'
			var totalString = translateString
			if (attributeMap.has('transform')) {
				totalString += ',' + attributeMap.get('transform')
			}
			attributeMap.set('transform', totalString)
			if (this.add3DTransform) {
				totalString = translateString
				if (attributeMap.has('transform3D')) {
					totalString += ',' + attributeMap.get('transform3D')
				}
				attributeMap.set('transform3D', totalString)
			}
			this.translate[0] += this.step[0]
		}
	}

	this.translate[0] = 0.0
	this.translate[1] += this.step[1]
},

processStatement: function(registry, statement) {
	statement.tag = 'g'
	this.step = getFloatsByDefault('step', registry, statement, this.tag, [10.0])
	if (this.step.length == 1) {
		this.step.push(this.step[0])
	}

	this.add3DTransform = getBooleanByDefault('3D', registry, statement, this.tag, false)
	this.translate = [0.0, 0.0]
	for (var child of statement.children) {
		this.addText(registry, statement, child)
	}
},

tag: 'map'
}

var gOutline = {
	processStatement: function(registry, statement) {
		var polylines = getChainPointListsHDRecursivelyDelete(registry, statement, 'polyline')
		Polyline.addPolygonsToPolylines(polylines, getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon'))
		var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
		var checkIntersection = getBooleanByDefault('checkIntersection', registry, statement, this.tag, false)
		var hole = getPointsByKey('hole', registry, statement)
		var markerAbsolute = getBooleanByDefault('markerAbsolute', registry, statement, this.tag, true)
		var outsets = getOutsets(registry, statement, this.tag)
		var marker = getMarker('marker', outsets, registry, statement)
		var baseMarker = getMarker('baseMarker', outsets, registry, statement)
		var tipMarker = getMarker('tipMarker', outsets, registry, statement)
		if (baseMarker == undefined) {
			baseMarker = marker
		}

		if (tipMarker == undefined) {
			tipMarker = marker
		}

		var outlines = getOutlines(baseLocation, baseMarker, checkIntersection, markerAbsolute, outsets, polylines, tipMarker)
		if (Vector.isEmpty(outlines)) {
			printCaller(['No outlines could be found for outline in generator2d.', statement])
			return
		}

		convertToGroup(statement)
		if (Vector.isEmpty(hole)) {
			var holeRadius = getFloatByDefault('holeRadius', registry, statement, this.tag, 0.0)
			if (holeRadius > 0.0) {
				var sides = getIntByDefault('sides', registry, statement, this.tag, 24)
				hole = getRegularPolygon([0.0, 0.0], false, 1.0, holeRadius, 0.0, sides, 0.0)
			}
		}

		if (!Vector.isEmpty(hole)) {
			var hole = getDirectedPolygon(!Polygon.isCounterclockwise(outlines[0]), hole)
			var holes = []
			var pointStringSet = new Set()
			for (var polyline of polylines) {
				for (var point of polyline) {
					var pointString = point.slice(0, 2).toString()
					if (!pointStringSet.has(pointString)) {
						holes.push(Polyline.getAddition2D(hole, point))
						pointStringSet.add(pointString)
					}
				}
			}
			outlines = getDifferencePolygonsByPolygons(outlines, holes)
		}

		var polygonGroups = getPolygonGroups(outlines)
		outlines.length = 0
		for (var polygonGroup of polygonGroups) {
			outlines.push(getConnectedPolygon(polygonGroup))
		}

		addPolygonsToGroup(outlines, registry, statement)
	},
	tag: 'outline'
}

var gScreen = {
	processStatement: function(registry, statement) {
		statement.tag = 'polygon'
		var box = getBox(registry, statement)
		if (Vector.isEmpty(box)) {
			printCaller(['No box could be generated for screen in generator2d.', statement])
			return
		}
		var overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		var thickness = getFloatByDefault('thickness', registry, statement, this.tag, 2.0)
		var width = getFloatByDefault('width', registry, statement, this.tag, 10.0)
		var bottomLeft = box[0]
		var topRight = box[2]
		var innerLeft = bottomLeft[0] + thickness
		var holePolygons = getHolePolygons(innerLeft, topRight[0] - thickness, bottomLeft[1], topRight, overhangAngle, thickness, width)
		var polygon = getConnectedPolygon([box.reverse()].concat(holePolygons)).reverse()
		statement.tag = 'polygon'
		setPointsExcept(polygon, registry, statement)
	},
	tag: 'screen'
}

var gTable = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var spreadsheetID = Value.getValueDefault(attributeMap.get('spreadsheetID'), attributeMap.get('id'))
		var tableID = getValueByKeyDefault('tableID', registry, statement, this.tag, 'table_0')
		var delimiter = getSpreadsheetDelimiter(statement)
		for (var child of statement.children) {
			gSpreadsheet.addTextToSpreadsheet(delimiter, spreadsheetID, registry, child)
		}

		var table = getSpreadsheetTable(registry, spreadsheetID, tableID)
		if (table == undefined) {
			printCaller(['No table for table in generator2D.', statement, attributeMap])
			return
		}
		var caption = getAttributeValue('caption', statement)
		var colorPeriod = getIntByDefault('colorPeriod', registry, statement, this.tag, 2)
		var fontSize = getFloatByDefault('font-size', registry, statement, this.tag, 12.0)
		var headerColor = getAttributeValue('headerColor', statement)
		var rowColor = getAttributeValue('rowColor', statement)
		var strokeWidth = getFloatByDefault('stroke-width', registry, statement, this.tag, 0.0)
		var tableAlign = getAlignment('tableAlign', registry, statement, this.tag)
		var tableStrokeWidth = getFloatByDefault('tableStrokeWidth', registry, statement, this.tag, 0.3)
		var textAnchor = getValueByKeyDefault('text-anchor', registry, statement, this.tag, 'middle')
		var x = getFloatByDefault('x', registry, statement, this.tag, 0.0)
		var y = getFloatByDefault('y', registry, statement, this.tag, 0.0)
		convertToGroup(statement)
		addTable(caption, colorPeriod, fontSize, headerColor,
		registry, rowColor, statement, strokeWidth, table, tableAlign, tableStrokeWidth, textAnchor, x, y)
	},
	tag: 'table'
}

var gText = {
processStatement: function(registry, statement) {
	var attributeMap = statement.attributeMap
	attributeMap.set('x', getFloatByDefault('x', registry, statement, this.tag, 0.0).toString())
	attributeMap.set('y', getFloatByDefault('y', registry, statement, this.tag, 0.0).toString())
	if (attributeMap.get('compression') == 'alphabeticRepeatQ') {
		var originalText = attributeMap.get('innerHTML')
		var compressedText = AlphabeticRepeatQ.getCompressed(originalText)
		attributeMap.set('compressionPercentage', getRoundedPercentageString(1.0 - compressedText.length / originalText.length))
		attributeMap.set('innerHTML', compressedText)
	}

	if (attributeMap.get('expansion') == 'alphabeticRepeatQ') {
		var originalText = attributeMap.get('innerHTML')
		var expandedText = AlphabeticRepeatQ.getExpanded(originalText)
		attributeMap.set('compressionPercentage', getRoundedFloatString(1.0 - originalText.length / expandedText.length))
		attributeMap.set('innerHTML', expandedText)
	}
},

tag: 'text',
}

var gTextFormat = {
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var id = attributeMap.get('id')
		var textFormatMapMap = registry.textFormatMapMap
		if (textFormatMapMap == undefined) {
			textFormatMapMap = new Map()
			registry.textFormatMapMap = textFormatMapMap
		}

		var textFormatMap = textFormatMapMap.get(id)
		if (textFormatMap == undefined) {
			textFormatMap = new Map()
			textFormatMapMap.set(id, textFormatMap)
		}

		var floatSet = new Set('dx dy font-size lineHeight height padding stroke-width width x y'.split(' '))
		for (var entry of attributeMap.entries()) {
			var key = entry[0]
			var value = entry[1]
			if (floatSet.has(key)) {
				value = getFloatByKeyStatementValue(key, registry, statement, value).toString()
			}
			textFormatMap.set(key, value)
		}
	},
	tag: 'textFormat'
}

var gGenerator2DProcessors = [
gFormattedText, gFractal2D, gGrid, gImage, gLettering, gList,
gMap, gOutline, gScreen, gTable, gText, gTextFormat]
