//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gBracketSpaceSet = new Set(['(', ')', ' '])
const gClose = 0.0000001
const gCloseSquared = gClose * gClose
const gDoublePi = Math.PI + Math.PI
const gHashMultiplier = 1.0 / 65537
const gHashRemainderMultiplier = (1.0 - (65536.0 * gHashMultiplier)) / 65536.0
const gHalfMinusOver = 0.499 / gClose
const gLengthLimit = 9876543
const gLengthLimitRoot = 3543
const gOneOverClose = Math.round(1.0 / gClose)
const gOneMinusClose = 1.0 - gClose
const gRadiansPerDegree = Math.PI / 180.0
const gRecursionLimit = 1000
const gThousanthsClose = 0.001 * gClose
const gXYZMap = new Map([['x', '1,0,0'], ['y', '0,1,0'], ['z', '0,0,1']])

function addToChainPointListsHDByDepth(depth, minimumLength, pointLists, registry, statement, tag) {
	if (statement.children == null) {
		return
	}
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 100 in addToPointLists reached, no further pointLists will be added.'
		var warningVariables = [gRecursionLimit, statement].concat(pointLists.slice(0, 10))
		warning(warningText, warningVariables)
		return
	}
	depth += 1
	for (var child of statement.children) {
		addToChainPointListsHDByDepth(depth, minimumLength, pointLists, registry, child, tag)
		if (child.attributeMap != null && child.tag == tag) {
			var points = getPointsHD(registry, child)
			if (getIsLong(points, minimumLength)) {
				var chainMatrix2D = getChainMatrix2D(registry, child)
				if (chainMatrix2D != null) {
					transform2DPoints(points, chainMatrix2D)
				}
				pointLists.push(points)
			}
		}
	}
}

function get2DMatrix(registry, statement) {
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

function get3DMatrices(registry, statement, tag) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var attributeMap = statement.attributeMap
	var matrices = null
	if (attributeMap.has('heights')) {
		var heights = getHeights(registry, statement, tag)
		var matrices = new Array(heights.length)
		for (var heightIndex = 0; heightIndex < heights.length; heightIndex++) {
			matrices[heightIndex] = get3DUnitMatrix()
			matrices[heightIndex][14] = heights[heightIndex]
		}
	}
	if (!attributeMap.has('transforms')) {
		return matrices
	}
	var separatedWords = getBracketSeparatedWords(attributeMap.get('transforms'))
	for (var wordIndex = separatedWords.length - 1; wordIndex > -1; wordIndex--) {
		matrices = get3DMatricesByEntry(matrices, registry, separatedWords, statement, wordIndex)
	}
	attributeMap.set('transforms', separatedWords.join(' '))
	return matrices
}

function get3DMatricesByEntry(matrices, registry, separatedWords, statement, wordIndex) {
	var entry = getBracketedEntry(separatedWords[wordIndex])
	if (entry == null) {
		return matrices
	}
	var transformType = entry[0]
	if (g2DTransformMap.has(transformType)) {
		var variableMap = getVariableMapByStatement(statement)
		for (var index = 0; index < matrices.length; index++) {
			variableMap.set('index', index.toString())
			var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
			if (index == 1) {
				separatedWords[wordIndex] = transformType + '(' + floats.toString() + ')'
			}
			var bracketMatrix = get3DMatrixBy2D(g2DTransformMap.get(transformType)(floats))
			matrices[index] = getMultiplied3DMatrix(bracketMatrix, matrices[index])
		}
		return matrices
	}
	if (g3DTransformMap.has(transformType)) {
		var variableMap = getVariableMapByStatement(statement)
		for (var index = 0; index < matrices.length; index++) {
			variableMap.set('index', index.toString())
			var floats = getFloatsUpdateByStatementValue(registry, statement, entry[1])[0]
			if (index == 1) {
				separatedWords[wordIndex] = transformType + '(' + floats.toString() + ')'
			}
			var bracketMatrix = g3DTransformMap.get(transformType)(floats)
			matrices[index] = getMultiplied3DMatrix(bracketMatrix, matrices[index])
		}
	}
	if (g3DMatricesMap.has(transformType)) {
		var points = getPointsByValue(registry, statement, entry[1])
		separatedWords[wordIndex] = transformType + '(' + getFloatListsString(points) + ')'
		return g3DMatricesMap.get(transformType)(points)
	}
	return matrices
}

function get3DMatrix(registry, statement) {
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
				var points = get3DPoints(registry, statement, entry[1])
				separatedWords[wordIndex] = transformType + '(' + getFloatListsString(points) + ')'
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

function get3DPoints(registry, statement, value) {
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

function getAttributeValue(key, statement) {
	for (var parentLevel = 0; parentLevel < gLengthLimit; parentLevel++) {
		if (statement.attributeMap != null) {
			if (statement.attributeMap.has(key)) {
				return statement.attributeMap.get(key)
			}
		}
		statement = statement.parent
		if (statement == null) {
			return undefined
		}
	}
	return undefined
}

function getBooleanByDefault(defaultValue, key, registry, statement, tag) {
	return getBooleanByStatementValue(key, registry, statement, getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getBooleanByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getBooleanByStatementValue(key, registry, statement, statement.attributeMap.get(key))
	}
	return null
}

function getBooleanByStatementValue(key, registry, statement, value) {
	value = value.trim()
	if (value.length == 0) {
		return null
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

function getChainMatrix2D(registry, statement) {
	var transformedMatrix = get2DMatrix(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == null) {
			return transformedMatrix
		}
		var skip2D = statement.tag == 'abstract' || statement.tag == 'window'
		if (statement.attributeMap.has('skip2D')) {
			skip2D = getBooleanByStatementValue('skip2D', registry, statement, statement.attributeMap.get('skip2D'))
		}
		if (!skip2D) {
			statementMatrix = get2DMatrix(registry, statement)
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

function getChainMatrix3D(registry, statement) {
	var transformedMatrix = get3DMatrix(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		var statement = statement.parent
		if (statement == null) {
			if (transformedMatrix == null) {
				return get3DUnitMatrix()
			}
			else {
				return transformedMatrix
			}
		}
		var skip3D = false
		if (statement.attributeMap.has('skip3D')) {
			skip3D = getBooleanByStatementValue('skip3D', registry, statement, statement.attributeMap.get('skip3D'))
		}
		if (!skip3D) {
			var statementMatrix = get3DMatrix(registry, statement)
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

function getChainPointListsHDRecursively(minimumLength, registry, statement, tag) {
	var pointLists = []
	addToChainPointListsHDByDepth(0, minimumLength, pointLists, registry, statement, tag)
	return pointLists
}

function getChainPointListsHDRecursivelyDelete(registry, statement, tag) {
	var pointLists = getChainPointListsHDRecursively(1, registry, statement, tag)
	deleteStatementsByTagDepth(0, registry, statement, tag)
	return pointLists
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
	if (statement.variableMap.has(equationString)) {
		return statement.variableMap.get(equationString)
	}
	return null
}

function getEquations(key, statement) {
	if (!statement.attributeMap.has(key)) {
		return null
	}
	var equationString = statement.attributeMap.get(key)
	for (var character of equationString) {
		if (gEquationSet.has(character)) {
			return [equationString]
		}
	}
	var equations = equationString.replace(/,/g, ' ').split(' ').filter(lengthCheck)
	for (var equationIndex = 0; equationIndex < equations.length; equationIndex++) {
		var equation = equations[equationIndex]
		if (statement.variableMap.has(equation)) {
			equations[equationIndex] = statement.variableMap.get(equation)
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
		var floatListsUpdate = getFloatListsUpdateByStatementValue(registry, statement, statement.attributeMap.get(key))
		if (floatListsUpdate[1]) {
			statement.attributeMap.set(key, getFloatListsString(floatLists))
		}
		return floatListsUpdate[0]
	}
	return null
}

function getFloatListsUpdateByStatementValue(registry, statement, value) {
	var points = []
	var values = value.split(' ').filter(lengthCheck)
	var update = false
	var variableMap = getVariableMapByStatement(statement.parent)
	variableMap.set('_points', points)
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
			floats = points[points.length - 1]
		}
		else {
			points.push(floats)
		}
	}
	return [points, update]
}

function getFloatListsString(floatLists) {
	var floatStrings = new Array(floatLists.length)
	for (var floatStringIndex = 0; floatStringIndex < floatStrings.length; floatStringIndex++) {
		floatStrings[floatStringIndex] = floatLists[floatStringIndex].toString()
	}
	return floatStrings.join(' ')
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
	if (value.length == 0) {
		return [undefined, false]
	}
	if (value.indexOf('(') != -1) {
		var value = getValueByEquation(registry, statement, value)
		if (Array.isArray(value)) {
			return [value, true]
		}
		return [[value], true]
	}
	var floats = value.split(',')
	var update = false
	for (var floatIndex = 0; floatIndex < floats.length; floatIndex++) {
		var float = floats[floatIndex]
		if (float.length == 0) {
			float = undefined
		}
		else {
			if (isNaN(float)) {
				float = getValueByEquation(registry, statement, float)
				update = true
			}
			else {
				float = parseFloat(float)
			}
		}
		floats[floatIndex] = float
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

function getPointByDefault(defaultValue, key, registry, statement, tag) {
	var point = getFloatsByDefault(defaultValue, key, registry, statement, tag)
	if (point.length == 1) {
		point.push(point[0])
	}
	return point
}

function getPointsByDefault(defaultValue, key, registry, statement, tag) {
	var floatListsString = getFloatListsString(defaultValue)
	var points = getPointsByValue(registry, statement, getValueByKeyDefault(floatListsString, key, registry, statement, tag))
	statement.attributeMap.set(key, getFloatListsString(points))
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
	var oldPoint = []
	var points = getFloatListsUpdateByStatementValue(registry, statement, value)[0]
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var parameters = points[pointIndex]
		if (parameters.length == 1) {
			parameters.push(0.0)
		}
		for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
			if (parameters[parameterIndex] == undefined) {
				if (oldPoint.length > parameterIndex) {
					parameters[parameterIndex] = oldPoint[parameterIndex]
				}
				else {
					parameters[parameterIndex] = 0.0
				}
			}
		}
		points[pointIndex] = parameters
		oldPoint = parameters
	}
	return points
}

function getPointsHD(registry, statement) {
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
	return getChainPointListsHDRecursively(3, registry, statement, 'polygon')
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
		if (value.length > 0) {
			if (Array.isArray(value[0])) {
				return getFloatListsString(value)
			}
		}
	}
	return value.toString()
}

function getTransformed2DMatrix(caller, registry, statement) {
	var transformedMatrix = get2DMatrix(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == null || statement == caller) {
			return transformedMatrix
		}
		statementMatrix = get2DMatrix(registry, statement)
		if (statementMatrix != null) {
			if (transformedMatrix == null) {
				transformedMatrix = statementMatrix
			}
			else {
				transformedMatrix = getMultiplied2DMatrix(statementMatrix, transformedMatrix)
			}
		}
	}
	return transformedMatrix
}

//deprecated25 because function get(value=0) should work on all browsers by then
function getValueByDefault(defaultValue, value) {
	if (value == undefined) {
		return defaultValue
	}
	return value
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
		if (statement == null) {
			return undefined
		}
	}
	return undefined
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
