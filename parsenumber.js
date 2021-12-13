//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gBracketSpaceSet = new Set(['(', ')', ' '])
const gClose = 0.0000001
const gCloseSquared = gClose * gClose
const gDoublePi = Math.PI + Math.PI
const gHashMultiplier = 1.0 / 65537
const gHashRemainderMultiplier = (1.0 - (65536.0 * gHashMultiplier)) / 65536.0
const gLengthLimit = 9876543
const gLengthLimitRoot = 3543
const gOneOverClose = Math.round(1.0 / gClose)
const gOneMinusClose = 1.0 - gClose
const gRadiansPerDegree = Math.PI / 180.0
const gRecursionLimit = 1000
const gThousanthsClose = 0.001 * gClose
const gXYZMap = new Map([['x', '1,0,0'], ['y', '0,1,0'], ['z', '0,0,1']])

function addToPointListsByDepth(depth, key, pointLists, registry, statement, tag) {
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
		addToPointListsByDepth(depth, key, pointLists, registry, child, tag)
		var points = getPointsByTag(key, registry, child, tag)
		if (points != null) {
			pointLists.push(points)
		}
	}
}

function deleteStatementsByTagDepth(depth, registry, statement, tag) {
	var children = statement.children
	if (children == null) {
		return
	}
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 100 in deleteStatementsByTagDepth reached, no further statements will be deleted.'
		var warningVariables = [gRecursionLimit, statement]
		warning(warningText, warningVariables)
		return
	}
	depth += 1
	for (var childIndex = children.length - 1; childIndex > -1; childIndex--) {
		var child = children[childIndex]
		deleteStatementsByTagDepth(depth, registry, child, tag)
		if (child.tag == tag) {
			children.splice(childIndex, 1)
		}
	}
	if (children.length == 1 && depth > 0) {
		if (children[0].nestingIncrement == -1) {
			var id = statement.attributeMap.get('id')
			var siblings = statement.parent.children
			for (var siblingIndex = 0; siblingIndex < siblings.length; siblingIndex++) {
				var sibling = siblings[siblingIndex]
				if (sibling.attributeMap.has('id')) {
					if (sibling.attributeMap.get('id') == id) {
						siblings.splice(siblingIndex, 1)
						return
					}
				}
			}
		}
	}
}

function get2DMatrix(registry, statement) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('transform')) {
		return null
	}
	var bracketString = attributeMap.get('transform')
	var entry = getBracketedEntry(bracketString)
	if (entry == null) {
		return null
	}
	var transformType = entry[0]
	if (!g2DTransformMap.has(transformType)) {
		return null
	}
	var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, entry[1])
	var floats = floatsUpdate[0]
	if (floatsUpdate[1]) {
		attributeMap.set('transform', entry[0] + '(' + floats.toString() + ')')
	}
	return g2DTransformMap.get(transformType)(floats)
}

function get3DFloats(registry, statement, value) {
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
	value = characters.join('')
	return getFloatsUpdateByStatementValue(registry, statement, value.replace(/ /g, ','))[0]
}

function get3DMatrix(registry, statement) {
	if (!statement.attributeMap.has('transform3D')) {
		return null
	}
	var entry = getBracketedEntry(statement.attributeMap.get('transform3D'))
	if (entry == null) {
		return null
	}
	var transformType = entry[0]
	if (!g3DTransformMap.has(transformType)) {
		return null
	}
	return g3DTransformMap.get(transformType)(get3DFloats(registry, statement, entry[1]))
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

function getCloseString(floatValue) {
	return (Math.round(floatValue * gOneOverClose) * gClose).toString()
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
			statement.attributeMap.set(key, getFloatListsString(floatListsUpdate[0]))
		}
		return floatListsUpdate[0]
	}
	return null
}

function getFloatListsUpdateByStatementValue(registry, statement, value) {
	if (value.startsWith('Polyline.')) {
		return [getValueByEquation(registry, statement, value), true]
	}
	var floatLists = value.split(' ').filter(lengthCheck)
	var updateAttributeMap = false
	var oldFloats = []
	var variableMap = getVariableMapByParent(statement.parent)
	variableMap.set('@floatLists', oldFloats)
	for (var floatListIndex = 0; floatListIndex < floatLists.length; floatListIndex++) {
		var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, floatLists[floatListIndex])
		var floats = floatsUpdate[0]
		floatLists[floatListIndex] = floats
		if (floatsUpdate[1]) {
			updateAttributeMap = true
		}
		for (var oldIndex = 0; oldIndex < Math.min(floats.length, oldFloats.length); oldIndex++) {
			if (floats[oldIndex] != undefined) {
				oldFloats[oldIndex] = floats[oldIndex]
			}
		}
		for (var oldIndex = oldFloats.length; oldIndex < floats.length; oldIndex++) {
			oldFloats.push(floats[oldIndex])
		}
	}
	variableMap.delete('@floatLists')
	return [floatLists, updateAttributeMap]
}

function getFloatListsString(floatLists) {
	var floatStrings = new Array(floatLists.length)
	for (var floatStringIndex = 0; floatStringIndex < floatStrings.length; floatStringIndex++) {
		floatStrings[floatStringIndex] = floatLists[floatStringIndex].toString()
	}
	return floatStrings.join(' ')
}

function getFloatsByDefault(defaultValue, key, registry, statement, tag) {
	var floatsUpdate = getFloatsUpdateByStatementValue(registry, statement, getValueByKeyDefault(defaultValue, key, registry, statement, tag))
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
		return [getValueByEquation(registry, statement, value), true]
	}
	var updateAttributeMap = false
	var floats = value.split(',')
	for (var floatIndex = 0; floatIndex < floats.length; floatIndex++) {
		var float = floats[floatIndex]
		if (float.length == 0) {
			float = undefined
			updateAttributeMap = true
		}
		else {
			if (isNaN(float)) {
				float = getValueByEquation(registry, statement, float)
				updateAttributeMap = true
			}
			else {
				float = parseFloat(float)
			}
		}
		floats[floatIndex] = float
	}
	return [floats, updateAttributeMap]
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
	var updateAttributeMap = false
	var ints = value.split(',')
	for (var intIndex = 0; intIndex < ints.length; intIndex++) {
		var int = ints[intIndex]
		if (int.length == 0) {
			int = undefined
			updateAttributeMap = true
		}
		else {
			if (isNaN(int)) {
				int = getValueByEquation(registry, statement, int)
				updateAttributeMap = true
			}
			else {
				int = parseInt(int)
			}
		}
		ints[intIndex] = int
	}
	return [ints, updateAttributeMap]
}

function getPointListsRecursively(key, registry, statement, tag) {
	var pointLists = []
	addToPointListsByDepth(0, key, pointLists, registry, statement, tag)
	return pointLists
}

function getPointListsRecursivelyDelete(key, registry, statement, tag) {
	var pointLists = getPointListsRecursively(key, registry, statement, tag)
	deleteStatementsByTagDepth(0, registry, statement, tag)
	return pointLists
}

function getPointsByKey(key, registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap == null) {
		return null
	}
	if (!attributeMap.has(key)) {
		return null
	}
	var oldPoint = []
	var points = getFloatListsUpdateByStatementValue(registry, statement, attributeMap.get(key))[0]
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var parameters = points[pointIndex]
		if (parameters.length == 1) {
			parameters.push(parameters[0])
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

function getPointsByTag(key, registry, statement, tag) {
	if (statement.tag != tag) {
		return null
	}
	return getPointsByKey(key, registry, statement)
}

function getPointsIncludingWork(registry, statement) {
	var points = getPointsByKey('points', registry, statement)
	var workStatement = getWorkStatement(registry, statement)
	if (workStatement == null) {
		return points
	}
	var workPoints = getPointsByKey('points', registry, workStatement)
	if (workPoints == null) {
		return points
	}
	if (points == null) {
		return workPoints
	}
	return pushArray(points, workPoints)
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
	return String(value)
}

function getTransformed2DMatrix(caller, registry, statement) {
	var transformedMatrix = get2DMatrix(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		statement = statement.parent
		if (statement == null || statement == caller) {
			if (transformedMatrix == null) {
				return get2DUnitMatrix()
			}
			else {
				return transformedMatrix
			}
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

function getTransformed3DMatrix(caller, registry, statement) {
	var transformedMatrix = get3DMatrix(registry, statement)
	for (var downIndex = 0; downIndex < gLengthLimit; downIndex++) {
		var statement = statement.parent
		if (statement == null || statement == caller) {
			if (transformedMatrix == null) {
				return get3DUnitMatrix()
			}
			else {
				return transformedMatrix
			}
		}
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
	return transformedMatrix
}

//deprecation2025
function getValueByDefault(defaultValue, value) {
	if (value == undefined) {
		return defaultValue
	}
	return value
}

function getVariableMapByParent(parent) {
	if (parent.variableMap == null) {
		parent.variableMap == new Map()
	}
	return parent.variableMap
}

function getVariableValue(name, statement) {
	for (var parentLevel = 0; parentLevel < gLengthLimit; parentLevel++) {
		if (statement.variableMap != null) {
			if (statement.variableMap.has(name)) {
				return statement.variableMap.get(name)
			}
		}
		if (statement.parent == null) {
			return undefined
		}
		statement = statement.parent
	}
	return undefined
}
