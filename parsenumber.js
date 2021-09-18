//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gClose = 0.0000001
const gCloseSquared = gClose * gClose
const gHashMultiplier = 1.0 / 65537
const gOneOverClose = Math.round(1.0 / gClose)
const gHashRemainderMultiplier = (1.0 - (65536.0 * gHashMultiplier)) / 65536.0
const gOneMinusClose = 1.0 - gClose
const gThousanthsClose = 0.001 * gClose
const gRadiansPerDegree = Math.PI / 180.0

function get2DMatrix(attributeMap) {
	if (attributeMap == null) {
		return null
	}
	if (!attributeMap.has('transform')) {
		return null
	}
	entry = getBracketedEntry(attributeMap.get('transform'))
	if (entry == null) {
		return null
	}
	transformType = entry[0]
	if (!g2DTransformMap.has(transformType)) {
		return null
	}
	return g2DTransformMap.get(transformType)(getFloats(entry[1]))
}

function get3DFloats(commaSeparated) {
	return getFloats(commaSeparated.replace(/x/g, '1,0,0').replace(/y/g, '0,1,0').replace(/z/g, '0,0,1'))
}

function get3DMatrix(attributeMap) {
	if (attributeMap == null) {
		return null
	}
	if (!attributeMap.has('transform3D')) {
		return null
	}
	entry = getBracketedEntry(attributeMap.get('transform3D'))
	if (entry == null) {
		return null
	}
	transformType = entry[0]
	if (!g3DTransformMap.has(transformType)) {
		return null
	}
	return g3DTransformMap.get(transformType)(get3DFloats(entry[1]))
}

function getAddition(additionString) {
	var multiplier = 1.0
	var totalValue = 0.0
	var values = additionString.replace(/-/g, ' - ').split('+').join(' + ').split(' ').filter(lengthCheck)
	for (var value of values) {
		if (value == '-') {
			multiplier = -1.0
		}
		else {
			if (value == '+') {
				multiplier = 1.0
			}
			else {
				totalValue += parseFloat(value) * multiplier
			}
		}
	}
	return totalValue
}

function getFloatByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return parseFloat(statement.attributeMap.get(key))
	}
	return null
}

function getBooleanByStatement(key, registry, statement) {
	if (!statement.attributeMap.has(key)) {
		return null
	}
	var booleanString = statement.attributeMap.get(key)
	if (booleanString.length == 0) {
		return null
	}
	var firstLetter = booleanString[0]
	if (firstLetter == 'f' || firstLetter == '0') {
		return false
	}
	if (firstLetter == 't' || firstLetter == '1') {
		return true
	}
	return null
}

function getCloseString(floatValue) {
	return (Math.round(floatValue * gOneOverClose) * gClose).toString()
}

function getFloatByDefault(defaultValue, key, registry, statement, tag) {
	return getFloatByKeyStatement(key, statement, getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getFloatByKeyStatement(key, statement, value) {
	var float = parseFloat(value)
	if (Number.isNaN(float)) {
		value = statement.parent.variableMap.get(value)
		float = parseFloat(value)
		statement.attributeMap.set(key, value.toString())
	}
	return float
}

function getFloatByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return parseFloat(statement.attributeMap.get(key))
	}
	return null
}

function getFloatLists(attributeMap, key) {
	if (!attributeMap.has(key)) {
		return null
	}
	var arrayWords = attributeMap.get(key).split(' ').filter(lengthCheck)
	if (arrayWords.length == 0) {
		return null
	}
	var floatLists = new Array(arrayWords.length)
	for (var arrayWordIndex = 0; arrayWordIndex < arrayWords.length; arrayWordIndex++) {
		var parameters = arrayWords[arrayWordIndex].split(',')
		for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
			var parameter = parameters[parameterIndex]
			if (parameter.length > 0) {
				parameters[parameterIndex] = parseFloat(parameter)
			}
			else {
				parameters[parameterIndex] = null
			}
		}
		floatLists[arrayWordIndex] = parameters
	}
	return floatLists
}

function getFloats(commaSeparated) {
	return commaSeparated.replace(/,/g, ' ').split(' ').filter(lengthCheck).map(parseFloat)
}

function getFloatsByDefault(defaultValue, key, registry, statement, tag) {
	return getFloats(getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getFloatsByStatement(key, registry, statement) {
	if (statement.attributeMap.has(key)) {
		return getFloats(statement.attributeMap.get(key))
	}
	return null
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
	var heights = getFloatsByDefault([1.0], 'heights', registry, statement, tag)
	if (heights.length == 1) {
		heights.splice(0, 0, 0.0)
	}
	return heights
}

function getIntByDefault(defaultValue, key, registry, statement, tag) {
	return parseInt(getValueByKeyDefault(defaultValue, key, registry, statement, tag))
}

function getPointsByKey(key, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap == null) {
		return null
	}
	if (!attributeMap.has(key)) {
		return null
	}
	var pointWords = attributeMap.get(key).split(' ').filter(lengthCheck)
	if (pointWords.length == 0) {
		return null
	}
	var oldPoint = []
	var points = new Array(pointWords.length)
	for (var pointWordIndex = 0; pointWordIndex < pointWords.length; pointWordIndex++) {
		var parameters = pointWords[pointWordIndex].split(',')
		if (parameters.length == 1) {
			parameters.push(parameters[0])
		}
		for (var parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
			var parameter = parameters[parameterIndex]
			if (parameter.length > 0) {
				parameters[parameterIndex] = parseFloat(parameter)
			}
			else {
				if (oldPoint.length > parameterIndex) {
					parameters[parameterIndex] = oldPoint[parameterIndex]
				}
				else {
					parameters[parameterIndex] = 0.0
				}
			}
		}
		points[pointWordIndex] = parameters
		oldPoint = parameters
	}
	return points
}

function getPointsByTag(key, statement, tag) {
	if (statement.tag != tag) {
		return null
	}
	return getPointsByKey(key, statement)
}

function getRotated32Bit(a, rotation)
{
	return a >>> rotation | a << (-rotation & 31)
}

function getRotatedLow24Bit(a, rotation)
{
	return (a << 8) >>> (8 + rotation) | (a << (-rotation & 31)) >>> 8 | (a >>> 24) << 24
}

function getTransformed2DMatrix(caller, statement) {
	var transformedMatrix = get2DMatrix(statement.attributeMap)
	for (var downIndex = 0; downIndex < 9876; downIndex++) {
		statement = statement.parent
		if (statement == null || statement == caller) {
			if (transformedMatrix == null) {
				return get2DUnitMatrix()
			}
			else {
				return transformedMatrix
			}
		}
		statementMatrix = get2DMatrix(statement.attributeMap)
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

function getTransformed3DMatrix(caller, statement) {
	var transformedMatrix = get3DMatrix(statement.attributeMap)
	for (var downIndex = 0; downIndex < 9876; downIndex++) {
		statement = statement.parent
		if (statement == null || statement == caller) {
			if (transformedMatrix == null) {
				return get3DUnitMatrix()
			}
			else {
				return transformedMatrix
			}
		}
		statementMatrix = get3DMatrix(statement.attributeMap)
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
