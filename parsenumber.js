//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gBracketSpaceSet = new Set(['(', ')', ' '])
const gClose = 0.0000001
const gCloseSquared = gClose * gClose
const gDegreesPerRadian = 180.0 / Math.PI
const gPI2 = Math.PI + Math.PI
const gFalseSet = new Set(['false', '0'])
const gHashMultiplier = 1.0 / 65537
const gHashRemainderMultiplier = (1.0 - (65536.0 * gHashMultiplier)) / 65536.0
const gHalfClose = 0.5 * gClose
const gHalfMinusOver = 0.499 / gClose
const gLengthLimit = 7654321
const gLengthLimitRoot = 2767
const gOneOverClose = Math.round(1.0 / gClose)
const gOneMinusClose = 1.0 - gClose
const gQuarterCloseSquared = 0.25 * gCloseSquared
const gRadiansPerDegree = Math.PI / 180.0
const gRecursionLimit = 1000
const gSVGExceptionSet = new Set(['height', 'width'])
const gTrueSet = new Set(['true', '1'])
const gXYZMap = new Map([['x', '1,0,0'], ['y', '0,1,0'], ['z', '0,0,1']])

function addMatrices3DByWord(matrices3D, registry, statement, word) {
	var entry = getBracketedEntry(word)
	if (entry == undefined) {
		return
	}

	var transformType = entry[0]
	if (transformType == 'transform3D') {
		matrices3D.push(getMatrix3DByWords(registry, statement, getBracketSeparatedWords(entry[1])))
		return
	}

	if (g3DTransformMap.has(transformType)) {
		var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
		matrices3D.push(g3DTransformMap.get(transformType)(floats))
		return
	}

	if (g3DMatricesMap.has(transformType)) {
		var points = getPointsByValue(registry, statement, entry[1])
		arrayKit.pushArray(matrices3D, g3DMatricesMap.get(transformType)(points))
	}
}

function addToChainPointListsHDByDepth(caller, depth, minimumLength, pointLists, registry, statement, tag) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 100 in addToChainPointListsHDByDepth reached, no further pointLists will be added.'
		var warningVariables = [gRecursionLimit, statement].concat(pointLists.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}

	if (!arrayKit.getIsEmpty(statement.attributeMap) && statement.tag == tag) {
		var points = getPointsHD(registry, statement)
		if (arrayKit.getIsArrayLong(points, minimumLength)) {
			var chainMatrix2D = getChainSkipMatrix2DUntil(caller, registry, statement)
			if (chainMatrix2D != undefined) {
				transform2DPoints(chainMatrix2D, points)
			}
			pointLists.push(points)
		}
	}

	if (statement.children == undefined) {
		return
	}

	depth += 1
	for (var child of statement.children) {
		addToChainPointListsHDByDepth(caller, depth, minimumLength, pointLists, registry, child, tag)
	}
}

function addToTagStatementsRecursivelyByDepth(caller, depth, minimumLength, tagStatements, registry, statement, tag) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1000 in addToTagStatementsRecursivelyByDepth reached, no further tagStatements will be added.'
		var warningVariables = [gRecursionLimit, statement].concat(tagStatements.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}

	if (!arrayKit.getIsEmpty(statement.attributeMap) && statement.tag == tag) {
		var points = getPointsHD(registry, statement)
		if (arrayKit.getIsArrayLong(points, minimumLength)) {
			var chainMatrix2D = getChainSkipMatrix2DUntil(caller, registry, statement)
			if (chainMatrix2D != undefined) {
				transform2DPoints(chainMatrix2D, points)
			}
			tagStatements.push({points:points, statement:statement})
		}
	}

	if (statement.children == undefined) {
		return
	}

	depth += 1
	for (var child of statement.children) {
		addToTagStatementsRecursivelyByDepth(caller, depth, minimumLength, tagStatements, registry, child, tag)
	}
}

function addZeroToFloats(floats) {
	if (floats.length == 1) {
		if (floats[0] > 0.0) {
			floats.splice(0, 0, 0.0)
		}
		else {
			floats.push(0.0)
		}
	}
}

function getAlignment(key, registry, statement, tag) {
	var alignmentTable = new Map([['left', 0.0], ['start', 0.0], ['center', 0.5], ['middle', 0.5], ['end', 1.0], ['right', 1.0]])
	var value = getValueByKeyDefault(key, registry, statement, tag, '0.0')
	if (alignmentTable.has(value)) {
		value = alignmentTable.get(value)
	}
	return getFloatByStatementValue(key, registry, statement, value)
}

function getAttributeFloat(key, statement) {
	return parseFloat(getAttributeValue(key, statement))
}

function getAttributeFloatByDefault(key, statement, valueDefault) {
	var value = getAttributeValue(key, statement)
	if (value == undefined) {
		value = valueDefault
	}

	return parseFloat(value)
}

function getAttributeValue(key, statement) {
	for (var parentLevel = 0; parentLevel < gRecursionLimit; parentLevel++) {
		if (statement.attributeMap != undefined) {
			if (statement.attributeMap.has(key)) {
				return statement.attributeMap.get(key)
			}
		}
		statement = statement.parent
		if (statement == undefined) {
			return undefined
		}
		if (statement.tag == 'svg') {
			if (gSVGExceptionSet.has(key)) {
				return undefined
			}
		}
	}
	return undefined
}

function getBaseAlphabet(number) {
	var baseAlphabet = ''
	for (var whileCount = 0; whileCount < 7; whileCount++) {
		var remainder = number % 26
		baseAlphabet = String.fromCharCode(65 + remainder) + baseAlphabet
		if (number < 26) {
			return baseAlphabet
		}
		else {
			number = (number - remainder) / 26
		}
	}
	return baseAlphabet
}

function getBooleanByDefault(key, registry, statement, tag, valueDefault) {
	return getBooleanByStatementValue(key, registry, statement, getValueByKeyDefault(key, registry, statement, tag, valueDefault))
}

function getBooleanByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getBooleanByStatementValue(key, registry, statement, statement.attributeMap.get(key))
	}

	return undefined
}

function getBooleanByStatementValue(key, registry, statement, value) {
	if (arrayKit.getIsEmpty(value)) {
		return undefined
	}

	value = value.trim()
	if (gFalseSet.has(value)) {
		return false
	}

	if (gTrueSet.has(value)) {
		return true
	}

	if (value.length == 0) {
		return undefined
	}

	var boolean = getValueByEquation(registry, statement, value)
	if (boolean == undefined) {
		return undefined
	}

	if (key != undefined) {
		statement.attributeMap.set(key, boolean.toString())
	}

	return boolean
}

function getBooleanByString(value) {
	value = value.trim()
	if (gFalseSet.has(value)) {
		return false
	}

	if (gTrueSet.has(value)) {
		return true
	}

	return undefined
}

function getChainMatrix2D(registry, statement) {
	var transformedMatrix = getMatrix2D(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == undefined) {
			return transformedMatrix
		}
		statementMatrix = getMatrix2D(registry, statement)
		if (statementMatrix != undefined) {
			if (transformedMatrix == undefined) {
				transformedMatrix = statementMatrix
			}
			else {
				transformedMatrix = getMultiplied2DMatrix(statementMatrix, transformedMatrix)
			}
		}
	}

	return transformedMatrix
}

function getChainMatrix3D(registry, statement, key) {
	var transformedMatrix = getMatrix3D(registry, statement, key)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		var statement = statement.parent
		if (statement == undefined) {
			if (transformedMatrix == undefined) {
				return getUnitMatrix3D()
			}
			else {
				return transformedMatrix
			}
		}
		var statementMatrix = getMatrix3D(registry, statement, key)
		if (statementMatrix != undefined) {
			if (transformedMatrix == undefined) {
				transformedMatrix = statementMatrix
			}
			else {
				transformedMatrix = getMultiplied3DMatrix(statementMatrix, transformedMatrix)
			}
		}
	}
	return transformedMatrix
}

function getChainPointListsHDRecursively(caller, minimumLength, registry, statement, tag) {
	var pointLists = []
	addToChainPointListsHDByDepth(caller, 0, minimumLength, pointLists, registry, statement, tag)
	return pointLists
}

function getChainPointListsHDRecursivelyDelete(registry, statement, tag) {
	var pointLists = getChainPointListsHDRecursively(statement, 1, registry, statement, tag)
	deleteStatementsByTagDepth(0, registry, statement, tag)
	return pointLists
}

function getChainSkipMatrix2D(registry, statement) {
	var transformedMatrix = getMatrix2D(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == undefined) {
			return transformedMatrix
		}
		var skip2D = statement.tag == 'abstract' || statement.tag == 'window'
		if (statement.attributeMap.has('skip2D')) {
			skip2D = getBooleanByStatementValue('skip2D', registry, statement, statement.attributeMap.get('skip2D'))
		}
		if (skip2D != true) {
			statementMatrix = getMatrix2D(registry, statement)
			if (statementMatrix != undefined) {
				if (transformedMatrix == undefined) {
					transformedMatrix = statementMatrix
				}
				else {
					transformedMatrix = getMultiplied2DMatrix(statementMatrix, transformedMatrix)
				}
			}
		}
	}

	return transformedMatrix
}

function getChainSkipMatrix2DUntil(caller, registry, statement) {
	var matrix2DUntil = getMatrix2D(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == undefined || statement == caller) {
			return matrix2DUntil
		}
		var skip2D = statement.tag == 'abstract' || statement.tag == 'window'
		if (statement.attributeMap.has('skip2D')) {
			skip2D = getBooleanByStatementValue('skip2D', registry, statement, statement.attributeMap.get('skip2D'))
		}
		if (skip2D != true) {
			statementMatrix = getMatrix2D(registry, statement)
			if (statementMatrix != undefined) {
				if (matrix2DUntil == undefined) {
					matrix2DUntil = statementMatrix
				}
				else {
					matrix2DUntil = getMultiplied2DMatrix(statementMatrix, matrix2DUntil)
				}
			}
		}
	}
	return matrix2DUntil
}

function getCloseString(floatValue) {
	return Value.getStep(floatValue, gClose).toString()
}

function getEquation(key, statement) {
	if (!statement.attributeMap.has(key)) {
		return undefined
	}

	var equationString = statement.attributeMap.get(key)
	for (var character of equationString) {
		if (gEquationSet.has(character)) {
			return equationString
		}
	}

	var equationValue = getVariableValue(equationString, statement)
	if (!arrayKit.getIsEmpty(equationValue)) {
		return equationValue
	}

	return undefined
}

function getEquations(key, statement) {
	if (!statement.attributeMap.has(key)) {
		return []
	}

	var equationString = statement.attributeMap.get(key)
	for (var character of equationString) {
		if (gEquationSet.has(character)) {
			return [equationString]
		}
	}

	var equations = []
	var equationStrings = equationString.split(' ').filter(lengthCheck)
	for (var equationString of equationStrings) {
		var equationValue = getVariableValue(equationString, statement)
		if (!arrayKit.getIsEmpty(equationValue)) {
			equations.push(equationValue)
		}
	}

	return equations
}

function getFixedStrings(floats, numberOfDecimals) {
	var fixedStrings = new Array(floats.length)
	numberOfDecimals = Value.getValueDefault(numberOfDecimals, 1)
	for (var floatIndex = 0; floatIndex < floats.length; floatIndex++) {
		fixedStrings[floatIndex] = floats[floatIndex].toFixed(numberOfDecimals)
	}

	return fixedStrings
}

function getFloatByDefault(key, registry, statement, tag, valueDefault) {
	return getFloatByStatementValue(key, registry, statement, getValueByKeyDefault(key, registry, statement, tag, valueDefault))
}

function getFloatByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getFloatByStatementValue(key, registry, statement, statement.attributeMap.get(key))
	}

	return undefined
}

function getFloatByStatementValue(key, registry, statement, value) {
	if (value.length == 0) {
		return undefined
	}

	if (isNaN(value)) {
		var float = getValueByEquation(registry, statement, value)
		if (float == undefined) {
			return undefined
		}
		if (key != undefined) {
			statement.attributeMap.set(key, float.toString())
		}
		return float
	}

	return parseFloat(value)
}

function getFloatListsByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		var floatListsUpdate = getFloatListsUpdateByStatementValue(registry, false, statement, statement.attributeMap.get(key))
		if (floatListsUpdate[1]) {
			statement.attributeMap.set(key, floatListsUpdate[0].join(' '))
		}
		return floatListsUpdate[0]
	}

	return undefined
}

function getFloatListsUpdateByStatementValue(registry, replaceUndefined, statement, value) {
	var oldPoint = []
	var points = []
	var values = getValuesSetVariableMap(statement, value)
	statement.variableMap.set('_points', points)
	var update = false
	for (var floatListIndex = 0; floatListIndex < values.length; floatListIndex++) {
		var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, values[floatListIndex])
		var floats = floatsUpdate[0]
		update = update || floatsUpdate[1]
		var isNestedArray = false
		if (Array.isArray(floats)) {
			if (floats.length > 0) {
				if (Array.isArray(floats[0])) {
					isNestedArray = true
				}
			}
		}
		if (isNestedArray) {
			arrayKit.pushArray(points, floats)
		}
		else {
			if (replaceUndefined) {
				arrayKit.setUndefinedElementsToArrayZero(floats, oldPoint)
			}
			points.push(floats)
		}
		oldPoint = points[points.length - 1]
	}

	return [points, update]
}

function getFloatsByDefault(key, registry, statement, tag, valueDefault) {
	return getFloatsByStatementValue(key, registry, statement, getValueByKeyDefault(key, registry, statement, tag, valueDefault))
}

function getFloatsByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getFloatsByStatementValue(key, registry, statement, statement.attributeMap.get(key))
	}

	return undefined
}

function getFloatsByStatementValue(key, registry, statement, value) {
	var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, value)
	if (floatsUpdate[1] && key != undefined) {
		statement.attributeMap.set(key, floatsUpdate[0].toString())
	}

	return floatsUpdate[0]
}

function getFloatsIncludingZero(key, registry, statement, tag) {
	var floats = getFloatsByDefault(key, registry, statement, tag, [1.0])
	addZeroToFloats(floats)
	arrayKit.replaceElements(floats, undefined, 0.0)
	statement.attributeMap.set(key, floats.toString())
	return floats
}

function getFloatsUpdateByStatementValue(registry, statement, value) {
	if (arrayKit.getIsEmpty(value)) {
		return [undefined, false]
	}

	if (value.indexOf('(') != -1 || value.indexOf('[') != -1) {
		var value = getValueByEquation(registry, statement, value)
		if (Array.isArray(value)) {
			return [value, true]
		}
		return [[value], true]
	}

	var floats = []
	var floatWords = value.split(',')
	var update = false
	for (var floatWord of floatWords) {
		if (floatWord.length == 0) {
			floats.push(undefined)
		}
		else {
			if (isNaN(floatWord)) {
				var equationValue = getValueByEquation(registry, statement, floatWord)
				if (arrayKit.getIsEmpty(equationValue)) {
					var noticeDescription = 'No equationValue could be found for getFloatsUpdateByStatementValue in parsenumber.'
					noticeByList([noticeDescription, floatWord, floatWords.slice(0), value, statement])
					floats.push(undefined)
				}
				else {
					if (Array.isArray(equationValue)) {
						arrayKit.pushArray(floats, equationValue)
					}
					else {
						floats.push(equationValue)
					}
				}
				update = true
			}
			else {
				floats.push(parseFloat(floatWord))
			}
		}
	}

	return [floats, update]
}

function getHashCubed(text) {
	var hashAround = getHashFloat(text) - 0.5
	return hashAround * hashAround * hashAround * 4.0
}

function getHashFloat(text) {
	var hash = 0
	for (var index = text.length - 1; index > -1; index--) {
		hash = (hash << 5) - hash + text.charCodeAt(index)
		hash = hash & hash
	}
	var hashPositive = hash >>> 0
	hash = getRotated32Bit(hash, (hashPositive) % 31)
	hash = getRotatedLow24Bit(hash, (hashPositive) % 23)
//	25033 = 65536 * (1.5 - Math.sqrt(1.25))
	return ((((hash >>> 0) % 65537) * 25033) % 65537) * gHashMultiplier + Math.abs(hash >> 15) * gHashRemainderMultiplier
}

function getHashInt(multiplier, text) {
	return Math.floor(multiplier * getHashFloat(text))
}

function getHeights(registry, statement, tag) {
	return getFloatsIncludingZero('height', registry, statement, tag)
}

function getIntByDefault(key, registry, statement, tag, valueDefault) {
	return getIntSetByStatementValue(key, registry, statement, getValueByKeyDefault(key, registry, statement, tag, valueDefault))
}

function getIntSetByStatementValue(key, registry, statement, value) {
	if (value.length == 0) {
		return undefined
	}

	if (isNaN(value)) {
		var int = getValueByEquation(registry, statement, value)
		statement.attributeMap.set(key, int.toString())
		return int
	}

	return parseInt(value)
}

function getIntsByDefault(key, registry, statement, tag, valueDefault) {
	var value = getValueByKeyDefault(key, registry, statement, tag, valueDefault)
	var intsUpdate = getIntsUpdateByStatementValue(registry, statement, value)
	if (intsUpdate[1]) {
		statement.attributeMap.set(key, intsUpdate[0].toString())
	}

	return intsUpdate[0]
}

function getIntsByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		var intsUpdate = getIntsUpdateByStatementValue(registry, statement, statement.attributeMap.get(key))
		if (intsUpdate[1]) {
			statement.attributeMap.set(key, intsUpdate[0].toString())
		}
		return intsUpdate[0]
	}

	return undefined
}

function getIntsUpdateByStatementValue(registry, statement, value) {
	if (value.length == 0) {
		return [undefined, false]
	}
	if (value.indexOf('(') != -1) {
		return [getValueByEquation(registry, statement, value), true]
	}
	var ints = value.split(',')
	var update = false
	for (var intIndex = 0; intIndex < ints.length; intIndex++) {
		var int = ints[intIndex]
		if (int.length == 0) {
			int = undefined
		}
		else {
			if (isNaN(int)) {
				int = getValueByEquation(registry, statement, int)
				update = true
			}
			else {
				int = parseInt(int)
			}
		}
		ints[intIndex] = int
	}
	return [ints, update]
}

function getMatrices3D(registry, statement, tag) {
	var heights = []
	if (statement.attributeMap.has('height')) {
		heights = getFloatsByDefault('height', registry, statement, tag, [1.0])
	}

	return getMatrices3DByHeights(heights, registry, statement)
}

function getMatrices3DAndZeroHeight(registry, statement, tag) {
	var matrices3D = getMatrices3D(registry, statement, tag)
	if (matrices3D.length == 0) {
		matrices3D.push(1.0)
	}

	if (matrices3D.length == 1) {
		var heightZero = matrices3D[0]
		if (Array.isArray(heightZero)) {
			heightZero = heightZero[14]
		}
		if (heightZero > 0.0) {
			matrices3D.splice(0, 0, 0.0)
		}
		else {
			matrices3D.push(0.0)
		}
	}

	return matrices3D
}

function getMatrices3DByHeights(heights, registry, statement) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('transforms')) {
		return heights
	}

	var transformMatrices3D = getMatrices3DByValue(registry, statement, attributeMap.get('transforms'))
	heights.length = Math.max(heights.length, transformMatrices3D.length)
	for (var matrix3DIndex = 0; matrix3DIndex < heights.length; matrix3DIndex++) {
		if (heights[matrix3DIndex] == undefined) {
			heights[matrix3DIndex] = transformMatrices3D[matrix3DIndex]
		}
		else {
			if (transformMatrices3D[matrix3DIndex] != undefined) {
				var z = heights[matrix3DIndex]
				heights[matrix3DIndex] = transformMatrices3D[matrix3DIndex]
				heights[matrix3DIndex][14] += z
			}
		}
	}

	attributeMap.set('transforms', heights.join(' '))
	return heights
}

function getMatrices3DByValue(registry, statement, value) {
	var matrices3D = []
	var separatedWords = getBracketSeparatedWords(value)
	for (var separatedWord of separatedWords) {
		addMatrices3DByWord(matrices3D, registry, statement, separatedWord)
	}

	return matrices3D
}

function getMatrix2D(registry, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('transform')) {
		return undefined
	}

	var matrix = undefined
	var separatedWords = getBracketSeparatedWords(attributeMap.get('transform'))
	for (var wordIndex = separatedWords.length - 1; wordIndex > -1; wordIndex--) {
		var entry = getBracketedEntry(separatedWords[wordIndex])
		if (entry != undefined) {
			var transformType = entry[0]
			if (g2DTransformMap.has(transformType)) {
				var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
				separatedWords[wordIndex] = transformType + '(' + floats.toString() + ')'
				var bracketMatrix = g2DTransformMap.get(transformType)(floats)
				if (matrix == undefined) {
					matrix = bracketMatrix
				}
				else {
					matrix = getMultiplied2DMatrix(bracketMatrix, matrix)
				}
			}
		}
	}
	attributeMap.set('transform', separatedWords.join(' '))
	return matrix
}

function getMatrix2DsByChildren(children, registry) {
	var matrix2DsByChildren = []
	for (var child of children) {
		matrix2Ds = getPointsByTag('matrix2D', registry, child, 'matrix2D')
		matrix2DsByChildren = arrayKit.getPushArray(matrix2DsByChildren, matrix2Ds)
	}
	return matrix2DsByChildren
}

function getMatrix2DUntil(caller, registry, statement) {
	var matrix2DUntil = getMatrix2D(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == undefined || statement == caller) {
			return matrix2DUntil
		}
		statementMatrix = getMatrix2D(registry, statement)
		if (statementMatrix != undefined) {
			if (matrix2DUntil == undefined) {
				matrix2DUntil = statementMatrix
			}
			else {
				matrix2DUntil = getMultiplied2DMatrix(statementMatrix, matrix2DUntil)
			}
		}
	}

	return matrix2DUntil
}

function getMatrix3D(registry, statement, key) {
	key = Value.getValueDefault(key, 'transform3D')
	var attributeMap = statement.attributeMap
	if (!statement.attributeMap.has(key)) {
		return undefined
	}

	var words = getBracketSeparatedWords(attributeMap.get(key))
	attributeMap.set(key, words.join(' '))
	return getMatrix3DByWords(registry, statement, words)
}

function getMatrix3DByWords(registry, statement, words) {
	var matrix3D = undefined
	for (var wordIndex = words.length - 1; wordIndex > -1; wordIndex--) {
		var entry = getBracketedEntry(words[wordIndex])
		if (entry != undefined) {
			var transformType = entry[0]
			if (g3DTransformMap.has(transformType)) {
				var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
				words[wordIndex] = transformType + '(' + floats.toString() + ')'
				var bracketMatrix3D = g3DTransformMap.get(transformType)(floats)
				if (matrix3D == undefined) {
					matrix3D = bracketMatrix3D
				}
				else {
					matrix3D = getMultiplied3DMatrix(bracketMatrix3D, matrix3D)
				}
			}
			if (g3DPointTransformMap.has(transformType)) {
				var points = getPoints3D(registry, statement, entry[1])
				words[wordIndex] = transformType + '(' + points.join(' ') + ')'
				var bracketMatrix3D = g3DPointTransformMap.get(transformType)(points)
				if (matrix3D == undefined) {
					matrix3D = bracketMatrix3D
				}
				else {
					matrix3D = getMultiplied3DMatrix(bracketMatrix3D, matrix3D)
				}
			}
		}
	}

	return matrix3D
}

function getMatrix3DsByChildren(children, registry) {
	var matrix3DsByChildren = []
	for (var child of children) {
		matrix3Ds = getPointsByTag('matrix3D', registry, child, 'matrix3D')
		matrix3DsByChildren = arrayKit.getPushArray(matrix3DsByChildren, matrix3Ds)
	}
	return matrix3DsByChildren
}

function getPath2DByStatement(registry, statement) {
	if (statement.attributeMap.has('path')) {
		return removeIdentical2DPoints(getPointsByValue(registry, statement, statement.attributeMap.get('path')))
	}
	var workStatement = getWorkStatementByKey('pathID', registry, statement)
	if (workStatement == undefined) {
		return []
	}
	return removeIdentical2DPoints(getPointsHDByStatementOnly(registry, workStatement))
}

function getPoint2DByDefault(key, registry, statement, tag, valueDefault) {
	return getPoint2DByStatementValue(key, registry, statement, getValueByKeyDefault(key, registry, statement, tag, valueDefault))
}

function getPoint2DByStatementValue(key, registry, statement, value) {
	var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, value)
	var point = floatsUpdate[0]
	if (arrayKit.getIsEmpty(point)) {
		point = [0.0]
	}

	if (point.length == 1) {
		point.push(point[0])
	}

	arrayKit.setUndefinedElementsToValue(point, 0.0)
	if (floatsUpdate[1] && key != undefined) {
		statement.attributeMap.set(key, point.toString())
	}

	return point
}

function getPoint3DByStatement(key, registry, statement) {
	var value = getAttributeValue(key, statement)
	if (arrayKit.getIsEmpty(value)) {
		return undefined
	}
	var update = false
	if (gXYZMap.has(value[0])) {
		value = gXYZMap.get(value[0])
		update = true
	}
	var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, value)
	var floats = floatsUpdate[0]
	var pointString = floats.toString()
	if (update || floatsUpdate[1]) {
		statement.attributeMap.set(key, pointString)
	}
	if (pointString.length == 0) {
		return undefined
	}
	var originalLength = floats.length
	for (var arrayIndex = originalLength; arrayIndex < 3; arrayIndex++) {
		floats.push(0.0)
		statement.attributeMap.set(key, floats.toString())
	}
	return floats
}

function getPoints3D(registry, statement, value) {
	if (value.length < 2) {
		return undefined
	}

	var characters = value.split('')
	if (gXYZMap.has(characters[0])) {
		if (gBracketSpaceSet.has(characters[1])) {
			characters[0] = gXYZMap.get(characters[0])
		}
	}

	for (var characterIndex = 1; characterIndex < characters.length - 1; characterIndex++) {
		if (gXYZMap.has(characters[characterIndex])) {
			if (gBracketSpaceSet.has(characters[characterIndex - 1]) && gBracketSpaceSet.has(characters[characterIndex + 1])) {
				characters[characterIndex] = gXYZMap.get(characters[characterIndex])
			}
		}
	}

	var character = characters[characters.length - 1]
	if (gXYZMap.has(character)) {
		if (gBracketSpaceSet.has(characters[characters.length - 2])) {
			characters[characters.length - 1] = gXYZMap.get(character)
		}
	}

	return getPointsByValue(registry, statement, characters.join(''))
}

function getPointsByDefault(key, registry, statement, tag, valueDefault) {
	var points = getPointsByValue(registry, statement, getValueByKeyDefault(key, registry, statement, tag, valueDefault.join(' ')))
	statement.attributeMap.set(key, points.join(' '))
	return points
}

function getPointsByKey(key, registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap == undefined) {
		return undefined
	}

	if (attributeMap.has(key)) {
		var points = getPointsByValue(registry, statement, attributeMap.get(key))
		statement.attributeMap.set(key, points.join(' '))
		return points
	}

	return undefined
}

function getPointsByTag(key, registry, statement, tag) {
	if (statement.tag != tag) {
		return undefined
	}

	return getPointsByKey(key, registry, statement)
}

function getPointsByValue(registry, statement, value) {
	var points = getFloatListsUpdateByStatementValue(registry, true, statement, value)[0]
	for (var point of points) {
		if (point.length == 1) {
			point.push(point[0])
		}
	}

	return points
}

function getPointsHD(registry, statement) {
	return getPointsHDByStatementOnly(registry, statement)
}

//deprecated24
function getPointsHDByStatementOnly(registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap.has('pointsHD')) {
		var points = getPointsByValue(registry, statement, attributeMap.get('pointsHD'))
		attributeMap.set('points', arrayKit.getShortArrays(points, 2).join(' '))
		return points
	}

	if (attributeMap.has('points')) {
		return getPointsByValue(registry, statement, attributeMap.get('points'))
	}

	return undefined
}

function getPolygonsHDRecursively(registry, statement) {
	return getChainPointListsHDRecursively(statement, 3, registry, statement, 'polygon')
}

function getPolygonStatementsRecursively(registry, statement, minimumLength) {
	minimumLength = Value.getValueDefault(minimumLength, 3)
	var polygonStatements = []
	addToTagStatementsRecursivelyByDepth(statement, 0, minimumLength, polygonStatements, registry, statement, 'polygon')
	return polygonStatements
}

function getRotated32Bit(a, rotation)
{
	return a >>> rotation | a << (-rotation & 31)
}

function getRotatedLow24Bit(a, rotation)
{
	return (a << 8) >>> (8 + rotation) | (a << (-rotation & 31)) >>> 8 | (a >>> 24) << 24
}

function getRoundedFloat(float, decimalPlaces = 1) {
	var powerTen = Math.round(Math.pow(10.0, decimalPlaces))
	return Math.round(float * powerTen) / powerTen
}

function getRoundedFloatString(float, decimalPlaces) {
	return getRoundedFloat(float, decimalPlaces).toString()
}

function getRoundedPercentageString(float, decimalPlaces) {
	return getRoundedFloat(float * 100.0, decimalPlaces).toString()
}

function getSignificant(decimalPlaces, value) {
	var absValue = Math.abs(value)
	if (absValue >= 100.0) {
		return value.toFixed(decimalPlaces)
	}

	if (absValue >= 10.0) {
		var significant = value.toFixed(Math.max(decimalPlaces, 1))
		if (significant.endsWith('.0')) {
			return significant.slice(0, significant.length - 2)
		}
		return significant
	}

	var significant = value.toFixed(Math.max(decimalPlaces, 2))
	if (significant.endsWith('0')) {
		return significant.slice(0, significant.length - 1)
	}

	return significant
}

function getString(value) {
	if (Array.isArray(value)) {
		return getStringByArray(0, value)
	}

	if (typeof(value) == 'object') {
		return mapKit.toStringByEntries(Object.entries(value))
	}

	if (value == undefined) {
		return 'undefined'
	}

	return value.toString()
}

function getStringByArray(depth, elements) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in getStringByArray in parsenumber reached, no further arrays will be added.'
		warningByList([warningText, elements, gRecursionLimit])
		return
	}

	depth += 1
	var betweens = []
	for (var element of elements) {
		if (element != undefined) {
			if (Array.isArray(element)) {
				betweens.push(getStringByArray(depth, element))
			}
			else {
				betweens.push(element.toString())
			}
		}
	}

	return '[' + betweens.join(',') + ']'
}

function getValues(value) {
	var values = []
	if (value == undefined) {
		return values
	}

	if (value.indexOf('(') == -1) {
		values = value.split(' ').filter(lengthCheck)
	}
	else {
		var bracketDepth = 0
		var token = ''
		for (var character of value) {
			if (character == ' ' && bracketDepth == 0) {
				if (token.length > 0) {
					values.push(token)
					token = ''
				}
			}
			else {
				bracketDepth += (character == '(') - (character == ')')
				token += character
			}
		}
		if (token.length > 0) {
			values.push(token)
		}
	}

	return values
}

function getVariableFloat(key, statement) {
	return parseFloat(getVariableValue(key, statement))
}

function getVariableFloatByDefault(key, statement, valueDefault) {
	var variableValue = getVariableValue(key, statement)
	if (variableValue == undefined) {
		return valueDefault
	}

	return parseFloat(variableValue)
}

function getVariableInt(key, statement) {
	return parseInt(getVariableValue(key, statement))
}

function getVariableIntByDefault(key, statement, valueDefault) {
	var variableValue = getVariableValue(key, statement)
	if (variableValue == undefined) {
		return valueDefault
	}

	return parseInt(variableValue)
}

function getVariableMapByStatement(statement) {
	if (statement.variableMap == undefined) {
		statement.variableMap = new Map()
	}

	return statement.variableMap
}

function getVariableValue(key, statement) {
	for (var parentLevel = 0; parentLevel < gLengthLimit; parentLevel++) {
		if (statement.variableMap != undefined) {
			if (statement.variableMap.has(key)) {
				return statement.variableMap.get(key)
			}
		}
		statement = statement.parent
		if (statement == undefined) {
			return undefined
		}
	}

	return undefined
}

function getVector2DByStatement(registry, statement) {
	var vector = getPoint3DByStatement('vector', registry, statement)
	if (arrayKit.getIsEmpty(vector)) {
		return [1.0, 0.0]
	}

	if (Vector.length == 1) {
		Vector.push(0.0)
	}

	var vectorLength = Vector.length2D(vector)
	if (vectorLength == 0.0) {
		noticeByList(['Zero length vector in getVector2DByStatement in parsenumber.', statement])
		return [1.0, 0.0]
	}

	return Vector.divide3DScalar(vector, vectorLength)
}

function getVector3DByStatement(registry, statement) {
	var vector = getPoint3DByStatement('vector', registry, statement)
	if (arrayKit.getIsEmpty(vector)) {
		return [1.0, 0.0, 0.0]
	}

	if (Vector.length == 1) {
		Vector.push(0.0)
	}

	if (Vector.length == 2) {
		Vector.push(0.0)
	}

	var vectorLength = Vector.length3D(vector)
	if (vectorLength == 0.0) {
		noticeByList(['Zero length vector in getVector3DByStatement in parsenumber.', statement])
		return [1.0, 0.0, 0.0]
	}

	return Vector.divide3DScalar(vector, vectorLength)
}

function pointsToFixed(points, numberOfDecimals) {
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		points[pointIndex] = getFixedStrings(points[pointIndex], numberOfDecimals)
	}

	return points
}

function roundPoints(points, decimalPlaces) {
	for (var point of points) {
		roundFloats(point, decimalPlaces)
	}

	return points
}

function roundFloats(floats, decimalPlaces) {
	for (var parameterIndex = 0; parameterIndex < floats.length; parameterIndex++) {
		floats[parameterIndex] = getRoundedFloat(floats[parameterIndex], decimalPlaces)
	}

	return floats
}

function setAttributeValue(key, monad, value) {
	for (var parentLevel = 0; parentLevel < gLengthLimit; parentLevel++) {
		if (monad.attributeMap != undefined) {
			if (monad.attributeMap.has(key)) {
				monad.attributeMap.set(key, value)
				return
			}
		}
		monad = monad.parent
		if (monad == undefined) {
			return
		}
	}
}

function setPointsHD(points, statement) {
	if (points.length > 0) {
		if (points[0].length > 2) {
			statement.attributeMap.set('pointsHD', points.join(' '))
			statement.attributeMap.set('points', arrayKit.getShortArrays(points, 2).join(' '))
			return
		}
	}
	statement.attributeMap.set('points', points.join(' '))
}
