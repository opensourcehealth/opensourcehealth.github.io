//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCharacterLengthMap = null
var gIntegerSet = new Set('-0123456789'.split(''))
var gLetteringMap = null
var gLetteringSet = null

function addPolygonsToGroup(polygons, registry, statement, copyKeys = true) {
	var exceptionSet = new Set(['checkIntersection', 'markerAbsolute', 'marker', 'outset'])
	var idStart = statement.attributeMap.get('id') + '_polygon_'
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var polygonStatement = getStatementByParentTag(new Map(), 0, statement, 'polygon')
		getUniqueID(idStart + polygonIndex.toString(), registry, polygonStatement)
		if (copyKeys) {
			copyMissingKeysExcept(exceptionSet, statement.attributeMap, polygonStatement.attributeMap)
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

function addTextStatement(monad, registry, statement, wordLengths) {
	if (wordLengths.length == 0) {
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
	var text = getJoinedWordByWordLengths(wordLengths)
	var textLength = 0
	for (var wordLength of wordLengths) {
		textLength += wordLength.length
	}
	var x = getAttributeFloat('x', monad) + parseFloat(getValueByDefault('0.0', getAttributeValue('dx', monad)))
	var textAttributeMap = new Map([['innerHTML', text], ['x', x.toString()], ['y', yString]])
	var fontSize = getAttributeFloat('font-size', root)
	var localFontSize = getAttributeFloat('font-size', monad)
	yString = getNextYString(localFontSize, monad, yString)
	var writableWidth = getAttributeFloat('right', monad) - getAttributeFloat('left', monad)
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
	var textMonadMap = new Map([['b', BoldMonad], ['i', ItalicMonad], ['p', ParagraphMonad], ['sub', SubscriptMonad]])
	textMonadMap.set('sup', SuperscriptMonad)
	var monad = new PlainMonad()
	monad.parent = format
	var words = text.split(' ').filter(lengthCheck)
	for (var word of words) {
		monad = getNextMonad(monad, textMonadMap, registry, statement, word)
	}
	monad.close(registry, statement)
}

function arcFromTo(fromX, fromY, toX, toY, radius, numberOfSides) {
	return arcFromToRadius(null, {parent:{variableMap:null}}, fromX, fromY, toX, toY, radius, true, numberOfSides)
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

function cellX(registry, statement) {
	var parent = statement.parent
	var variableMap = getVariableMapByStatement(parent)
	var cellColumn = getVariableInt('grid_cellColumn', parent)
	if (cellColumn >= getVariableFloat('grid_columns', parent)) {
		cellColumn = 0
		variableMap.set('grid_cellColumn', '0')
		variableMap.set('grid_cellRow', (getVariableInt('grid_cellRow', parent) + 1).toString())
	}
	var x = cellColumn * getVariableFloat('grid_cellWidth', parent)
	variableMap.set('grid_cellColumn', (getVariableInt('grid_cellColumn', parent) + 1).toString())
	return x
}

function cellY(registry, statement) {
	return getVariableInt('grid_cellRow', statement.parent) * getVariableFloat('grid_cellHeight', statement.parent)
}

function closeByDYMultiplier(dyMultiplier, monad, registry, statement) {
	var fontSize = getAttributeFloat('font-size', monad)
	var dy = dyMultiplier * fontSize
	var joinedWord = getJoinedWordByWordLengths(monad.wordLengths)
	var joinedLength = getTextLength(joinedWord) * fontSize
	var word = '<tspan dx = "-' + (0.2 * fontSize).toString() + '"  dy = "' + dy.toString() + '" font-size = "'
	word += (0.6 * fontSize).toString() + '">' + joinedWord + '</tspan><tspan display="none" dy = "' + (-dy).toString() + '">.</tspan>'
	monad.parent.wordLengths.push({word:word, length:joinedLength})
	monad.wordLengths.length = 0
}

function createCharacterPolylineMap() {
	gLetteringSet = new Set(['B', 'K', 'R', 'X'])
	gLetteringMap = new Map()
	var bottomDiagonal = [[0, 1], [1, 0]]
	var bottomHorizontalSemicircle = arcFromTo(1, 0.5, 0, 0.5, 0.5)
	var bottomLeftArc = arcFromTo(1.0, 0.03, 0.5, 0, 0.8)
	var bottomLine = [[0, 0], [1, 0]]
	var bottomSemicircle = multiplyArraysByIndex(arcFromTo(0, 1, 0, 0, 0.5), 2.0, 0)
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
	gLetteringMap.set('A', [[[0, 0], [0.2, 0.8], [0.5, 2], [0.8, 0.8], [1, 0]], [[0.2,0.8], [0.8,0.8]]])
	gLetteringMap.set('B', [bottomSemicircle, leftBisectedPolyline, topSemicircle])
	gLetteringMap.set('C', [bottomLeftArc, leftTallSemicircle, topRightArc])
	gLetteringMap.set('D', [arcFromTo(0, 2, 0, 0, 1), leftLine])
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
	var s = [arcFromTo(0.5, 0, 0.1, 0.03, 0.8), arcFromTo(0.853, 0.853, 0.5, 0, 0.5), [[0.853, 0.853], [0.147, 1.147]]]
	pushArray(s, [arcFromTo(0.147, 1.147, 0.5, 2, 0.5), arcFromTo(0.5, 2, 0.9, 1.97, 0.8)])
	gLetteringMap.set('S', s)
	gLetteringMap.set('T', [middleVerticalLine, [[0, 2], [0.5, 2], [1, 2]]])
	gLetteringMap.set('U', [lowRightLine, bottomHorizontalSemicircle, lowLeftLine])
	gLetteringMap.set('V', [[[0, 2], [0.5, 0], [1, 2]]])
	gLetteringMap.set('W', [[[0, 2], [0.375, 0], [0.75, 1.8], [1.125, 0], [1.5, 2]]])
	gLetteringMap.set('X', [diagonalDown, diagonalUp])
	gLetteringMap.set('Y', [[[0.5, 0], [0.5, 1]], [[0, 2], [0.5, 1], [1, 2]]])
	gLetteringMap.set('Z', [bottomLine, diagonalUp, topLine])
}

function getAnchorFontParent(registry, statement) {
	var attributeMap = new Map()
	var fontSize = getAttributeValue('font-size', statement)
	if (fontSize == undefined) {
		fontSize = '12'
		statement.attributeMap.set('font-size', fontSize)
	}
	attributeMap.set('font-size', fontSize)
	attributeMap.set('id', statement.attributeMap.get('id'))
	var textAnchor = getAttributeValue('text-anchor', statement)
	if (textAnchor == undefined) {
		textAnchor = 'middle'
		statement.attributeMap.set('text-anchor', textAnchor)
	}
	attributeMap.set('text-anchor', textAnchor)
	return {attributeMap:attributeMap}
}

function getBox(registry, statement) {
	var points = getPointsHD(registry, statement)
	if (getIsEmpty(points)) {
		return null
	}
	for (var point of points) {
		if (point.length == 1) {
			point.push(point[0])
		}
	}
	var pointZero = points[0]
	if (points.length == 1) {
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
		var z = points[0][2]
		for (var point of points) {
			point.push(z)
		}
	}
	return points
}

function getJoinedWordByWordLengths(wordLengths) {
	if (wordLengths.length == 0) {
		return ''
	}
	var joinedWords = new Array(wordLengths.length)
	for (var wordLengthIndex = 0; wordLengthIndex < wordLengths.length; wordLengthIndex++) {
		joinedWords[wordLengthIndex] = wordLengths[wordLengthIndex].word
	}
	return joinedWords.join(' ')
}

function getLetteringOutlines(fontHeight, strokeWidth, text, textAlign) {
	var betweenCharacter = 0.1 * fontHeight + strokeWidth
	var halfHeight = fontHeight * 0.5
	var averageAdvance = halfHeight + betweenCharacter
	var letteringOutlines = []
	var maximumX = 0
	var radius = strokeWidth / fontHeight
	var outsets = [[radius, radius]]
	var x = 0
	if (gLetteringMap == null) {
		createCharacterPolylineMap()
	}
	for (var character of text) {
		var polylines = gLetteringMap.get(character)
		if (polylines == null) {
			x += averageAdvance
		}
		else {
			var outlines = getOutlines(null, null, gLetteringSet.has(character), true, outsets, polylines, null)
			var polygon = getConnectedPolygon(outlines)
			polygon = getArraysCopy(polygon)
			multiply2DsByScalar(polygon, halfHeight)
			var boundingX = getBoundingXByPolygons([polygon])
			x -= boundingX[0]
			addArraysByIndex(polygon, x, 0)
			letteringOutlines.push(polygon)
			x += boundingX[1]
			maximumX = x
			x += betweenCharacter
		}
	}
	addArrayArraysByIndex(letteringOutlines, -textAlign * maximumX, 0)
	return letteringOutlines
}

function getNextMonad(monad, monadMap, registry, statement, word) {
	if (word == '>') {
		if (monad.shouldAddAttributes) {
			monad.attributeMap = new Map(getAttributes(getQuoteSeparatedSnippets(getJoinedWordByWordLengths(monad.wordLengths))))
			monad.wordLengths.length = 0
			monad.shouldAddAttributes = undefined
			return monad
		}
	}
	if (word.startsWith('<')) {
		var tag = word.slice(1)
		if (tag.startsWith('/')) {
			monad.close(registry, statement)
			return monad.parent
		}
		if (tag.endsWith('>')) {
			tag = tag.slice(0, -1)
		}
		var nextMonadConstructor = TSpanMonad
		if (monadMap.has(tag)) {
			nextMonadConstructor = monadMap.get(tag)
		}
		var nextMonad = new nextMonadConstructor()
		nextMonad.attributeMap = new Map()
		nextMonad.parent = monad
		if (!word.endsWith('>')) {
			nextMonad.shouldAddAttributes = true
		}
		nextMonad.wordLengths = []
		nextMonad.initialize(registry, statement)
		return nextMonad
	}
	var fontSize = getAttributeFloat('font-size', monad)
	monad.wordLengths.push({word:word, length:getTextLength(word) * fontSize})
	return monad
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
	setFloatByKeyStatement(attributeMap, 0.0, 'dx', registry, statement)
	setFloatByKeyStatement(attributeMap, 0.0, 'left', registry, statement)
	var lineHeight = getFloatByStatement('lineHeight', registry, statement)
	if (!getIsEmpty(lineHeight)) {
		attributeMap.set('lineHeight', lineHeight.toString())
	}
	setFloatByKeyStatement(attributeMap, 0.0, 'right', registry, statement)
	setFloatByKeyStatement(attributeMap, 0.0, 'x', registry, statement)
	setFloatByKeyStatement(attributeMap, 0.0, 'y', registry, statement)
	return monad
}

function getTextLength(text) {
	if (gCharacterLengthMap == null) {
		gCharacterLengthMap = new Map()
		var characterLengths = 'a 435 b 500 c 444 d 499 e 444 f 373 g 467 h 498 i 278'.split(' ')
		pushArray(characterLengths, 'j 348 k 513 l 258 m 779 n 489 o 491 p 500 q 499 r 345'.split(' '))
		pushArray(characterLengths, 's 367 t 283 u 490 v 468 w 683 x 482 y 471 z 417'.split(' '))
		pushArray(characterLengths, 'A 721 B 631 C 670 D 719 E 610 F 564 G 722 H 714 I 327'.split(' '))
		pushArray(characterLengths, 'J 385 K 709 L 611 M 881 N 725 O 724 P 576 Q 723 R 667'.split(' '))
		pushArray(characterLengths, 'S 529 T 606 U 721 V 701 W 947 X 714 Y 701 Z 613'.split(' '))
		pushArray(characterLengths, '0 500 1 500 2 500 3 500 4 500 5 500 6 500 7 500 8 500 9 500'.split(' '))
		pushArray(characterLengths, ') 333 ! 333 @ 865 # 500 $ 500 % 833 ^ 469 & 778 * 500 ( 333'.split(' '))
		pushArray(characterLengths, ', 250 < 564 . 250 > 564 / 296 ? 444 ; 250 : 250 [ 333'.split(' '))
		pushArray(characterLengths, '{ 480 ] 333 } 480 | 200 - 333 _ 500 = 564 + 564 ` 250 ~ 500'.split(' '))
		for (var characterIndex = 0; characterIndex < characterLengths.length; characterIndex += 2) {
			gCharacterLengthMap.set(characterLengths[characterIndex], 0.001 * parseFloat(characterLengths[characterIndex + 1]))
		}
	}
	gCharacterLengthMap.set(' ', 0.249)
	gCharacterLengthMap.set("'", 0.266)
	gCharacterLengthMap.set('"', 0.332)
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
		var textAnchor = getAttributeValue('text-anchor', this)
		var fontSize = getAttributeFloat('font-size', this)
		var left = getAttributeFloat('left', this)
		var right = getAttributeFloat('right', this)
		var writableWidth = right - left
		var x = left
		if (textAnchor == 'end' ) {
			x = right
		}
		else {
			if (textAnchor == 'middle' ) {
				x = 0.5 * (left + right)
			}
		}
		this.attributeMap.set('x', x.toString())
		var oldLength = 0.0
		var oldWordLengths = []
		for (var wordLength of this.wordLengths) {
			if (wordLength.length > writableWidth) {
				if (oldWordLengths.length > 0) {
					addTextStatement(this, registry, statement, oldWordLengths)
					oldLength = 0
				}
				addTextStatement(this, registry, statement, [wordLength])
			}
			else {
				oldLength += wordLength.length
				if (oldWordLengths.length > 0) {
					oldLength += getTextLength(' ') * fontSize
				}
				oldWordLengths.push(wordLength)
				if (oldLength > writableWidth) {
					oldWordLengths.pop()
					addTextStatement(this, registry, statement, oldWordLengths)
					oldLength = wordLength.length
					oldWordLengths = [wordLength]
				}
			}
		}
		addTextStatement(this, registry, statement, oldWordLengths)
		var yString = getAttributeValue('y', this)
		setAttributeValue('y', this, getNextYString(getAttributeFloat('font-size', this), this, yString))
	}
	this.initialize = function(registry, statement) {
		this.parent.close(registry, statement)
	}
}


function PlainMonad() {
	this.close = function(registry, statement) {
		addTextStatement(this, registry, statement, this.wordLengths)
	}
	this.wordLengths = []
}

function setFloatByKeyStatement(attributeMap, defaultValue, key, registry, statement) {
	attributeMap.set(key, getFloatByDefault(defaultValue, key, registry, statement, statement.tag).toString())
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

var gFormattedText = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'formattedText',
	processStatement: function(registry, statement) {
		if (statement.attributeMap.has('text')) {
			addTextStatements(getTextFormatMonad(registry, statement), registry, statement, statement.attributeMap.get('text'))
			convertToGroup(statement)
			return
		}
		noticeByList(['No text could be found for formattedText in generator2d.', statement])
	}
}

var gFractal2D = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'fractal2D',
	processStatement: function(registry, statement) {
		var view = new ViewFractal2D()
		view.blueFrequency = getFloatByDefault(0.89, 'blueFrequency', registry, statement, this.name)
		view.escapeRadius = getFloatByDefault(2.0, 'escapeRadius', registry, statement, this.name)
		view.changePixels = getIntByDefault(10000, 'changePixels', registry, statement, this.name)
		view.greenFrequency = getFloatByDefault(0.11, 'greenFrequency', registry, statement, this.name)
		view.id = statement.attributeMap.get('id')
		view.iterations = getIntByDefault(200, 'iterations', registry, statement, this.name)
		view.pixelSize = getIntByDefault(1, 'pixelSize', registry, statement, this.name)
		view.redFrequency = getFloatByDefault(0.03, 'redFrequency', registry, statement, this.name)
		view.type = statement.attributeMap.get('type')
		view.x = getFloatByDefault(0.0, 'x', registry, statement, this.name)
		view.y = getFloatByDefault(0.0, 'y', registry, statement, this.name)
		view.zoom = getFloatByDefault(1.0, 'zoom', registry, statement, this.name)
		var controlBoxHeight = 2 * viewBroker.controlWidth + 6 * viewBroker.wideHeight + 3.5 * viewBroker.textSpace
		viewBroker.minimumHeight = Math.max(viewBroker.minimumHeight, controlBoxHeight)
		registry.views.push(view)
	}
}

var gGrid = {
	initialize: function() {
		gParentFirstSet.add(this.name)
		gTagCenterMap.set(this.name, this)
		addFunctionToVariableEntries(cellX, gSetR)
		addFunctionToVariableEntries(cellY, gSetR)
	},
	name: 'grid',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var parent = statement.parent

		var cellHeight = getVariableFloatByDefault(100.0, 'grid_cellHeight', parent)
		var cellWidth = getVariableFloatByDefault(100.0, 'grid_cellWidth', parent)
		var columns = getVariableIntByDefault(1, 'grid_columns', parent)
		var cornerMultiplier = getFloatByDefault(1.0, 'corner', registry, statement, this.name)
		var rows = getVariableIntByDefault(1, 'grid_rows', parent)
		var lineLength = getFloatByDefault(2.0, 'lineLength', registry, statement, this.name)
		var cornerLength = getFloatByDefault(lineLength, 'cornerLength', registry, statement, this.name)
		var edgeLength = getFloatByDefault(lineLength, 'edgeLength', registry, statement, this.name)
		var insideLength = getFloatByDefault(lineLength, 'insideLength', registry, statement, this.name)
		var outsideLength = getFloatByDefault(0.0, 'outsideLength', registry, statement, this.name)
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
	}
}

var gImage = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'image',
	processStatement: function(registry, statement) {
		getPointsExcept(null, registry, statement)
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
		addPolygonsToGroup(outlines, registry, statement, false)
	}
}

var gList = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'list',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var children = []
		var parent = statement.parent
		var variableValue = getVariableValue('list_children', parent)
		if (variableValue != undefined) {
			children = variableValue.split(' ')
		}
		var margin = getVariableFloatByDefault(2.0, 'list_margin', parent)
		var transform = getVariableValue('list_transform', parent)
		if (attributeMap.has('transform')) {
			transform = attributeMap.get('transform')
		}
		var cellWidth = getVariableFloatByDefault(100.0, 'grid_cellWidth', parent)
		var x = 0.5 * cellWidth
		if (!getIsEmpty(transform)) {
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
		setFloatByKeyStatement(parentAttributeMap, 0.0, 'dy', registry, statement)
		setFloatByKeyStatement(parentAttributeMap, margin, 'left', registry, statement)
		setFloatByKeyStatement(parentAttributeMap, cellWidth - margin, 'right', registry, statement)
		setFloatByKeyStatement(parentAttributeMap, 0.5 * cellWidth, 'x', registry, statement)
		setFloatByKeyStatement(parentAttributeMap, 0.0, 'y', registry, statement)

		var formatMonads = []
		var variableValue = getVariableValue('list_formats', parent)
		if (variableValue != undefined) {
			var formatWords = variableValue.split(' ').filter(lengthCheck)
			for (var formatWord of formatWords) {
				if (formatWord.length > 0) {
					var formatAttributes = formatWord.split(';')
					var formatAttributeMap = new Map()
					var formatMonad = {attributeMap:formatAttributeMap, parent:anchorFontParent}
					for (var formatAttribute of formatAttributes) {
						var formatEntry = formatAttribute.split(':')
						var key = formatEntry[0]
						if (key.length > 0) {
							formatAttributeMap.set(key, formatEntry[1])
							if (key.startsWith('image')) {
								formatMonad.isImage = true
							}
						}
					}
					if (formatAttributeMap.has('name')) {
						formatMonads.push(formatMonad)
					}
				}
			}
		}
		if (formatMonads.length == 0) {
			noticeByList(['No formats could be found for list in generator2d.', statement])
			return
		}

		for (var formatMonad of formatMonads) {
			var name = formatMonad.attributeMap.get('name')
			if (attributeMap.has(name)) {
				var value = attributeMap.get(name)
				value = getValueByDefault(value, getVariableValue(value, statement))
				var keyValue = getAttributeValue('key', formatMonad)
				if (keyValue != undefined) {
					value = value.trim()
					if (value.length == 0) {
						if (attributeMap.has(keyValue)) {
							value = attributeMap.get(keyValue)
						}
					}
				}
				var lowerValue = getAttributeValue('lower', formatMonad)
				if (lowerValue != undefined) {
					if (getBooleanByString(lowerValue)) {
						value = value.toLowerCase()
					}
				}
				var compressedValue = getAttributeValue('compressed', formatMonad)
				if (compressedValue != undefined) {
					if (getBooleanByString(compressedValue)) {
						value = value.trim().replace(/ /g, '')
					}
				}
				if (formatMonad.isImage) {
					var x = getAttributeFloat('x', formatMonad) + parseFloat(getValueByDefault('0.0', getAttributeValue('dx', formatMonad)))
					var yString = getAttributeValue('y', formatMonad)
					var imagePrefix = getAttributeValue('imagePrefix', formatMonad)
					if (imagePrefix != undefined) {
						value = imagePrefix + value
					}
					var imageSuffix = getAttributeValue('imageSuffix', formatMonad)
					if (imageSuffix != undefined) {
						value += imageSuffix
					}
					var imageMap = new Map([['href', value], ['x', x.toString()], ['y', yString]])
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
					attributeMap.set(name, words.join(' '))
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
		setPointsExcept(points, registry, statement)
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
		setPointsExcept(points, registry, statement)
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
		setPointsExcept(points, registry, statement)
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
		var outsideness = getFloatByDefault(1.0, 'outsideness', registry, statement, this.name)
		var radius = getFloatByDefault(1.0, 'r', registry, statement, this.name)
		var sideOffset = getFloatByDefault(0.0, 'sideOffset', registry, statement, this.name)
		var sides = getFloatByDefault(24.0, 'sides', registry, statement, this.name)
		var startAngle = getFloatByDefault(0.0, 'startAngle', registry, statement, this.name)
		startAngle *= gRadiansPerDegree
		var angleIncrement = gDoublePi / sides
		startAngle += sideOffset * angleIncrement
		var center = [cx, cy]
		radius *= outsideness / Math.cos(0.5 * angleIncrement) + 1.0 - outsideness
		var points = new Array(sides)
		var point = polarRadius(startAngle, radius)
		var rotation = polarCounterclockwise(angleIncrement)
		for (var vertexIndex = 0; vertexIndex < sides; vertexIndex++) {
			points[vertexIndex] = getAddition2D(point, center)
			rotate2DVector(point, rotation)
		}
		statement.tag = 'polygon'
		setPointsExcept(points, registry, statement)
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
		setPointsExcept(polygon, registry, statement)
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
		var deltaBegin = getSubtraction2D(points[0], points[1])
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
		setPointsExcept(points, registry, statement)
	}
}

var gGenerator2DProcessors = [
gCircle, gFormattedText, gFractal2D, gGrid, gImage, gLettering, gList, gOutline,
gPolygon, gPolyline, gRectangle, gRegularPolygon, gScreen, gText, gVerticalHole]
