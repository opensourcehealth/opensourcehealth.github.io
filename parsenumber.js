//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gBracketSpaceSet = new Set(['(', ')', ' '])
const gClose = 0.0000001
const gCloseSquared = gClose * gClose
const gDegreesPerRadian = 180.0 / Math.PI
const gDoublePi = Math.PI + Math.PI
const gHashMultiplier = 1.0 / 65537
const gHashRemainderMultiplier = (1.0 - (65536.0 * gHashMultiplier)) / 65536.0
const gHalfClose = 0.5 * gClose
const gHalfMinusOver = 0.499 / gClose
const gLengthLimit = 7654321
const gLengthLimitRoot = 4321
const gOneOverClose = Math.round(1.0 / gClose)
const gOneMinusClose = 1.0 - gClose
const gQuarterCloseSquared = 0.25 * gCloseSquared
const gRadiansPerDegree = Math.PI / 180.0
const gRecursionLimit = 1000
const gXYZMap = new Map([['x', '1,0,0'], ['y', '0,1,0'], ['z', '0,0,1']])

function addMatrices3DByWord(matrices3D, registry, statement, word) {
	var entry = getBracketedEntry(word)
	if (entry == null) {
		return
	}
	var transformType = entry[0]
	if (g2DTransformMap.has(transformType)) {
		var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
		matrices3D.push(getMatrix3DBy2D(g2DTransformMap.get(transformType)(floats)))
		return
	}
	if (g3DTransformMap.has(transformType)) {
		var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
		matrices3D.push(g3DTransformMap.get(transformType)(floats))
		return
	}
	if (g3DMatricesMap.has(transformType)) {
		var points = getPointsByValue(registry, statement, entry[1])
		pushArray(matrices3D, g3DMatricesMap.get(transformType)(points))
	}
}

function addToChainPointListsHDByDepth(caller, depth, minimumLength, pointLists, registry, statement, tag) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 100 in addToChainPointListsHDByDepth reached, no further pointLists will be added.'
		var warningVariables = [gRecursionLimit, statement].concat(pointLists.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}
	if (!getIsEmpty(statement.attributeMap) && statement.tag == tag) {
		var points = getPointsHD(registry, statement)
		if (getIsLong(points, minimumLength)) {
			var chainMatrix2D = getChainSkipMatrix2DUntil(caller, registry, statement)
			if (chainMatrix2D != null) {
				transform2DPoints(chainMatrix2D, points)
			}
			pointLists.push(points)
		}
	}
	if (statement.children == null) {
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
	if (!getIsEmpty(statement.attributeMap) && statement.tag == tag) {
		var points = getPointsHD(registry, statement)
		if (getIsLong(points, minimumLength)) {
			var chainMatrix2D = getChainSkipMatrix2DUntil(caller, registry, statement)
			if (chainMatrix2D != null) {
				transform2DPoints(chainMatrix2D, points)
			}
			tagStatements.push({points:points, statement:statement})
		}
	}
	if (statement.children == null) {
		return
	}
	depth += 1
	for (var child of statement.children) {
		addToTagStatementsRecursivelyByDepth(caller, depth, minimumLength, tagStatements, registry, child, tag)
	}
}

function getAttributeFloat(key, statement) {
	return parseFloat(getAttributeValue(key, statement))
}

function getAttributeFloatByDefault(defaultValue, key, statement) {
	var value = getAttributeValue(key, statement)
	if (value == undefined) {
		return defaultValue
	}
	return parseFloat(value)
}

function getAttributeValue(key, statement) {
	for (var parentLevel = 0; parentLevel < gLengthLimit; parentLevel++) {
		if (statement.attributeMap != undefined) {
			if (statement.attributeMap.has(key)) {
				return statement.attributeMap.get(key)
			}
		}
		statement = statement.parent
		if (statement == undefined) {
			return undefined
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

function getBooleanByDefault(defaultValue, key, registry, statement, tag) {
	return getBooleanByStatementValue(key, registry, statement, getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getBooleanByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getBooleanByStatementValue(key, registry, statement, statement.attributeMap.get(key))
	}
	return undefined
}

function getBooleanByStatementValue(key, registry, statement, value) {
	if (value == false || value == 0) {
		return false
	}
	if (value == true || value == 1) {
		return true
	}
	value = value.trim()
	if (value.length == 0) {
		return undefined
	}
	if (value == 'false' || value == '0') {
		return false
	}
	if (value == 'true' || value == '1') {
		return true
	}
	var boolean = getValueByEquation(registry, statement, value)
	statement.attributeMap.set(key, boolean.toString())
	return boolean
}

function getBooleanByString(text) {
	text = text.trim()
	if (text.length == 0) {
		return undefined
	}
	if (text == 'false' || text == '0') {
		return false
	}
	if (text == 'true' || text == '1') {
		return true
	}
	return undefined
}

function getChainMatrix3D(registry, statement) {
	var transformedMatrix = getMatrix3D(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		var statement = statement.parent
		if (statement == undefined) {
			if (transformedMatrix == null) {
				return getUnitMatrix3D()
			}
			else {
				return transformedMatrix
			}
		}
		var statementMatrix = getMatrix3D(registry, statement)
		if (statementMatrix != null) {
			if (transformedMatrix == null) {
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
			if (statementMatrix != null) {
				if (transformedMatrix == null) {
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
			if (statementMatrix != null) {
				if (matrix2DUntil == null) {
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

function getChainSkipMatrix3D(registry, statement) {
	var transformedMatrix = getMatrix3D(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		var statement = statement.parent
		if (statement == undefined) {
			if (transformedMatrix == null) {
				return getUnitMatrix3D()
			}
			else {
				return transformedMatrix
			}
		}
		var skip3D = false
		if (statement.attributeMap.has('skip3D')) {
			skip3D = getBooleanByStatementValue('skip3D', registry, statement, statement.attributeMap.get('skip3D'))
		}
		if (skip3D != true) {
			var statementMatrix = getMatrix3D(registry, statement)
			if (statementMatrix != null) {
				if (transformedMatrix == null) {
					transformedMatrix = statementMatrix
				}
				else {
					transformedMatrix = getMultiplied3DMatrix(statementMatrix, transformedMatrix)
				}
			}
		}
	}
	return transformedMatrix
}

function getCloseString(floatValue) {
	return (Math.round(floatValue * gOneOverClose) * gClose).toString()
}

function getEquation(key, statement) {
	if (!statement.attributeMap.has(key)) {
		return null
	}
	var equationString = statement.attributeMap.get(key)
	for (var character of equationString) {
		if (gEquationSet.has(character)) {
			return equationString
		}
	}
	var equationValue = getVariableValue(equationString, statement)
	if (!getIsEmpty(equationValue)) {
		return equationValue
	}
	return null
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
	var equationStrings = equationString.replace(/,/g, ' ').split(' ').filter(lengthCheck)
	for (var equationString of equationStrings) {
		var equationValue = getVariableValue(equationString, statement)
		if (!getIsEmpty(equationValue)) {
			equations.push(equationValue)
		}
	}
	return equations
}

function getFloatByDefault(defaultValue, key, registry, statement, tag) {
	return getFloatByStatementValue(key, registry, statement, getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getFloatByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getFloatByStatementValue(key, registry, statement, statement.attributeMap.get(key))
	}
	return null
}

function getFloatByStatementValue(key, registry, statement, value) {
	if (value.length == 0) {
		return undefined
	}
	if (isNaN(value)) {
		var float = getValueByEquation(registry, statement, value)
		statement.attributeMap.set(key, float.toString())
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
	return null
}

function getFloatListsUpdateByStatementValue(registry, replaceUndefined, statement, value) {
	var oldPoint = []
	var points = []
	var values = []
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
	var variableMap = getVariableMapByStatement(statement.parent)
	var update = false
	variableMap.set('_points', points)
	variableMap.set('_values', values)
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
			pushArray(points, floats)
		}
		else {
			if (replaceUndefined) {
				for (var parameterIndex = 0; parameterIndex < floats.length; parameterIndex++) {
					if (floats[parameterIndex] == undefined) {
						if (oldPoint.length > parameterIndex) {
							floats[parameterIndex] = oldPoint[parameterIndex]
						}
						else {
							floats[parameterIndex] = 0.0
						}
					}
				}
			}
			points.push(floats)
		}
		oldPoint = points[points.length - 1]
	}
	return [points, update]
}

function getFloatsByDefault(defaultValue, key, registry, statement, tag) {
	var value = getValueByKeyDefault(defaultValue, key, registry, statement, tag)
	var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, value)
	if (floatsUpdate[1]) {
		statement.attributeMap.set(key, floatsUpdate[0].toString())
	}
	return floatsUpdate[0]
}

function getFloatsByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, statement.attributeMap.get(key))
		if (floatsUpdate[1]) {
			statement.attributeMap.set(key, floatsUpdate[0].toString())
		}
		return floatsUpdate[0]
	}
	return null
}

function getFloatsUpdateByStatementValue(registry, statement, value) {
	if (getIsEmpty(value)) {
		return [undefined, false]
	}
	if (value.indexOf('(') != -1) {
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
				if (getIsEmpty(equationValue)) {
					var noticeDescription = 'No equationValue could be found for getFloatsUpdateByStatementValue in parsenumber.'
					noticeByList([noticeDescription, floatWord, value, statement])
					floats.push(undefined)
				}
				else {
					if (Array.isArray(equationValue)) {
						pushArray(floats, equationValue)
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
	var heights = getFloatsByDefault([0.0, 1.0], 'heights', registry, statement, tag)
	if (heights.length == 1) {
		heights.splice(0, 0, 0.0)
		statement.attributeMap.set('heights', heights.toString())
	}
	replaceElements(heights, undefined, 0.0)
	return heights
}

function getIntByDefault(defaultValue, key, registry, statement, tag) {
	return getIntByStatementValue(key, registry, statement, getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getIntByStatementValue(key, registry, statement, value) {
	if (value.length == 0) {
		return null
	}
	if (isNaN(value)) {
		var int = getValueByEquation(registry, statement, value)
		statement.attributeMap.set(key, int.toString())
		return int
	}
	return parseInt(value)
}

function getIntsByDefault(defaultValue, key, registry, statement, tag) {
	var value = getValueByKeyDefault(defaultValue, key, registry, statement, tag)
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
	return null
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
	if (statement.attributeMap.has('heights')) {
		var heights = getFloatsUpdateByStatementValue(registry, statement, statement.attributeMap.get('heights'))[0]
		if (!getIsEmpty(heights)) {
			return getMatrices3DByHeights(heights, registry, statement)
		}
	}
	return getMatrices3DByHeights([], registry, statement)
}

function getMatrices3DAndZeroHeight(registry, statement, tag) {
	if (statement.attributeMap.has('heights')) {
		var heights = getHeights(registry, statement, tag)
		if (!getIsEmpty(heights)) {
			return getMatrices3DByHeights(heights, registry, statement)
		}
	}
	return getMatrices3DByHeights([], registry, statement)
}

function getMatrices3DByHeights(heights, registry, statement) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var attributeMap = statement.attributeMap
	var matrices3D = new Array(heights.length)
	for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
		matrices3D[heightIndex] = getUnitMatrix3D()
		matrices3D[heightIndex][14] = heights[heightIndex]
	}
	statement.attributeMap.set('heights', heights.toString())
	if (!attributeMap.has('transforms')) {
		return matrices3D
	}
	var transformMatrices3D = getMatrices3DByValue(registry, statement, attributeMap.get('transforms'))
	matrices3D.length = Math.max(matrices3D.length, transformMatrices3D.length)
	for (var matrix3DIndex = 0; matrix3DIndex < matrices3D.length; matrix3DIndex++) {
		if (matrices3D[matrix3DIndex] == undefined) {
			matrices3D[matrix3DIndex] = transformMatrices3D[matrix3DIndex]
		}
		else {
			matrices3D[matrix3DIndex] = getMultiplied3DMatrix(matrices3D[matrix3DIndex], transformMatrices3D[matrix3DIndex])
		}
	}
	attributeMap.set('transforms', matrices3D.join(' '))
	return matrices3D
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
		return null
	}
	var matrix = null
	var separatedWords = getBracketSeparatedWords(attributeMap.get('transform'))
	for (var wordIndex = separatedWords.length - 1; wordIndex > -1; wordIndex--) {
		var entry = getBracketedEntry(separatedWords[wordIndex])
		if (entry != null) {
			var transformType = entry[0]
			if (g2DTransformMap.has(transformType)) {
				var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
				separatedWords[wordIndex] = transformType + '(' + floats.toString() + ')'
				var bracketMatrix = g2DTransformMap.get(transformType)(floats)
				if (matrix == null) {
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
		matrix2Ds = getPointsByTag('matrix2Ds', registry, child, 'matrix2D')
		matrix2DsByChildren = getPushArray(matrix2DsByChildren, matrix2Ds)
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
		if (statementMatrix != null) {
			if (matrix2DUntil == null) {
				matrix2DUntil = statementMatrix
			}
			else {
				matrix2DUntil = getMultiplied2DMatrix(statementMatrix, matrix2DUntil)
			}
		}
	}
	return matrix2DUntil
}

function getMatrix3D(registry, statement) {
	var attributeMap = statement.attributeMap
	if (!statement.attributeMap.has('transform3D')) {
		return null
	}
	var matrix = null
	var separatedWords = getBracketSeparatedWords(attributeMap.get('transform3D'))
	for (var wordIndex = separatedWords.length - 1; wordIndex > -1; wordIndex--) {
		var entry = getBracketedEntry(separatedWords[wordIndex])
		if (entry != null) {
			var transformType = entry[0]
			if (g3DTransformMap.has(transformType)) {
				var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
				separatedWords[wordIndex] = transformType + '(' + floats.toString() + ')'
				var bracketMatrix = g3DTransformMap.get(transformType)(floats)
				if (matrix == null) {
					matrix = bracketMatrix
				}
				else {
					matrix = getMultiplied3DMatrix(bracketMatrix, matrix)
				}
			}
			if (g3DPointTransformMap.has(transformType)) {
				var points = getPoints3D(registry, statement, entry[1])
				separatedWords[wordIndex] = transformType + '(' + points.join(' ') + ')'
				var bracketMatrix = g3DPointTransformMap.get(transformType)(points)
				if (matrix == null) {
					matrix = bracketMatrix
				}
				else {
					matrix = getMultiplied3DMatrix(bracketMatrix, matrix)
				}
			}
		}
	}
	attributeMap.set('transform3D', separatedWords.join(' '))
	return matrix
}

function getMatrix3DsByChildren(children, registry) {
	var matrix3DsByChildren = []
	for (var child of children) {
		matrix3Ds = getPointsByTag('matrix3Ds', registry, child, 'matrix3D')
		matrix3DsByChildren = getPushArray(matrix3DsByChildren, matrix3Ds)
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

function getPoint3DByStatement(key, registry, statement) {
	if (!statement.attributeMap.has(key)) {
		return undefined
	}
	var value = statement.attributeMap.get(key)
	if (value.length == 0) {
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

function getPointByDefault(defaultValue, key, registry, statement, tag) {
	var point = getFloatsByDefault(defaultValue, key, registry, statement, tag)
	if (point.length == 1) {
		point.push(point[0])
	}
	return point
}

function getPoints3D(registry, statement, value) {
	if (value.length < 2) {
		return null
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

function getPointsByDefault(defaultValue, key, registry, statement, tag) {
	var points = getPointsByValue(registry, statement, getValueByKeyDefault(defaultValue.join(' '), key, registry, statement, tag))
	statement.attributeMap.set(key, points.join(' '))
	return points
}

function getPointsByKey(key, registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap == null) {
		return null
	}
	if (attributeMap.has(key)) {
		return getPointsByValue(registry, statement, attributeMap.get(key))
	}
	return null
}

function getPointsByTag(key, registry, statement, tag) {
	if (statement.tag != tag) {
		return null
	}
	return getPointsByKey(key, registry, statement)
}

function getPointsByValue(registry, statement, value) {
	return getFloatListsUpdateByStatementValue(registry, true, statement, value)[0]
}

function getPointsHD(registry, statement) {
	var points = getPointsHDByStatementOnly(registry, statement)
	if (points != null) {
		return points
	}
	var workStatement = getWorkStatement(registry, statement)
	if (workStatement == undefined) {
		return null
	}
	return getPointsHDByStatementOnly(registry, workStatement)
}

function getPointsHDByStatementOnly(registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap.has('pointsHD')) {
		var points = getPointsByValue(registry, statement, attributeMap.get('pointsHD'))
		attributeMap.set('points', getShortArrays(2, points).join(' '))
		return points
	}
	if (attributeMap.has('points')) {
		return getPointsByValue(registry, statement, attributeMap.get('points'))
	}
	return null
}

function getPolygonsHDRecursively(registry, statement) {
	return getChainPointListsHDRecursively(statement, 3, registry, statement, 'polygon')
}

function getPolygonStatementsRecursively(registry, statement, minimumLength) {
	minimumLength = getValueByDefault(3, minimumLength)
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

function getString(value) {
	if (Array.isArray(value)) {
		return getStringByArray(0, value)
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
		if (Array.isArray(element)) {
			betweens.push(getStringByArray(depth, element))
		}
		else {
			betweens.push(element.toString())
		}
	}
	return '[' + betweens.join(',') + ']'
}

function getVariableFloat(key, statement) {
	return parseFloat(getVariableValue(key, statement))
}

function getVariableFloatByDefault(defaultValue, key, statement) {
	var variableValue = getVariableValue(key, statement)
	if (variableValue == undefined) {
		return defaultValue
	}
	return parseFloat(variableValue)
}

function getVariableInt(key, statement) {
	return parseInt(getVariableValue(key, statement))
}

function getVariableIntByDefault(defaultValue, key, statement) {
	var variableValue = getVariableValue(key, statement)
	if (variableValue == undefined) {
		return defaultValue
	}
	return parseInt(variableValue)
}

function getVariableMapByStatement(statement) {
	if (statement.variableMap == null) {
		statement.variableMap = new Map()
	}
	return statement.variableMap
}

function getVariableValue(key, statement) {
	for (var parentLevel = 0; parentLevel < gLengthLimit; parentLevel++) {
		if (statement.variableMap != null) {
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
	if (getIsEmpty(vector)) {
		return [1.0, 0.0]
	}
	if (vector.length == 1) {
		vector.push(0.0)
	}
	var vectorLength = length2D(vector)
	if (vectorLength == 0.0) {
		noticeByList(['Zero length vector in getVector2DByStatement in parsenumber.', statement])
		return [1.0, 0.0]
	}
	return divide3DScalar(vector, vectorLength)
}

function getVector3DByStatement(registry, statement) {
	var vector = getPoint3DByStatement('vector', registry, statement)
	if (getIsEmpty(vector)) {
		return [1.0, 0.0, 0.0]
	}
	if (vector.length == 1) {
		vector.push(0.0)
	}
	if (vector.length == 2) {
		vector.push(0.0)
	}
	var vectorLength = length3D(vector)
	if (vectorLength == 0.0) {
		noticeByList(['Zero length vector in getVector3DByStatement in parsenumber.', statement])
		return [1.0, 0.0, 0.0]
	}
	return divide3DScalar(vector, vectorLength)
}

function roundFloats(floats, places) {
	for (var floatIndex = 0; floatIndex < floats; floatIndex++) {
		floats[floatIndex] = parseFloat(parameter.toFixed(places))
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
			statement.attributeMap.set('points', getShortArrays(2, points).join(' '))
			return
		}
	}
	statement.attributeMap.set('points', points.join(' '))
}
