//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gClose = 0.0000001
const gOneOverClose = Math.round(1.0 / gClose)

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

function getCloseString(floatValue) {
	return (Math.round(floatValue * gOneOverClose) * gClose).toString()
}

function getFloats(commaSeparated) {
	return commaSeparated.replace(/,/g, ' ').split(' ').filter(lengthCheck).map(parseFloat)
}

function getFloatValue(defaultValue, key, registry, statement) {
	attributeMap = statement.attributeMap
	var tagMap = null
	if (registry.defaultMap.has(statement.tag)) {
		tagMap = registry.defaultMap.get(statement.tag)
	}
	else {
		tagMap = new Map()
		registry.defaultMap.set(statement.tag, tagMap)
	}
	tagMap.set(key, defaultValue.toString())
	keyStatement = getKeyStatement(key, statement)
	if (keyStatement == null) {
		return defaultValue
	}
	floatString = keyStatement[1].attributeMap.get(keyStatement[0])
	attributeMap.delete(key)
	return parseFloat(floatString)
}

function getTransformed2DMatrix(caller, statement) {
	var transformedMatrix = get2DMatrix(statement.attributeMap)
	for (downIndex = 0; downIndex < 9876; downIndex++) {
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
